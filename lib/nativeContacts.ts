// Native contact picker — only does anything inside the Capacitor shell
// (Capacitor.isNativePlatform() is false in the web build, same code
// either way, same pattern lib/nativePush.ts already uses for push
// tokens). Lets someone pick a real device contact instead of typing a
// name and email by hand — the actual friction point identified for a
// low-tech-literacy user picking who to send an ad-hoc meeting request to.
//
// pickContact() opens the OS's own native contact picker for a single
// contact — the closest native analog to the browser's Contact Picker
// API, which real testing this session found does NOT work reliably
// inside a bare Capacitor WebView on either platform. listNativeContacts()
// below uses getContacts() instead (the full address book) — originally
// skipped in favor of pickContact() alone, until a real-user request
// specifically asked for a WhatsApp-style "browse my own contacts inside
// the app, tap one, go straight into it" flow, which the OS single-picker
// dialog can't give (it always hands control back to the OS picker UI,
// not Ittsui's own list).
//
// IMPLEMENTED BUT NOT VERIFIED ON A REAL DEVICE — same honest status
// docs/android.md already uses for the geolocation gap. No physical
// Android/iOS device or emulator was available to confirm the permission
// prompt and picker actually appear correctly; the permission wiring
// (AndroidManifest.xml, Info.plist) and this code were verified by
// reading the plugin's own source directly (not assumed from its docs)
// to confirm the exact permission alias and method behavior, and the web
// (no-op) path and TypeScript types were verified, but the native path
// itself needs a real device before this moves from "implemented" to
// "verified".
//
// A picked contact commonly has a name but no email — most phone contacts
// sync from an address book that isn't email-first. Returns whatever was
// actually on the contact (email/phone both nullable) rather than
// pretending an email always exists; the caller still needs its own
// fallback for "picked a real contact, but there's no email — ask for
// just that one field" rather than treating a missing email as a failure.

import { Capacitor } from "@capacitor/core";

export interface PickedContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

// null return means "not on a native platform", "permission denied", or
// "the person cancelled the picker" — all handled identically by the
// caller (fall back to the existing manual-entry fields), matching the
// resilience shape of every other best-effort integration in this codebase.
export async function pickNativeContact(): Promise<PickedContact | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { Contacts } = await import("@capacitor-community/contacts");

    const permission = await Contacts.checkPermissions();
    if (permission.contacts !== "granted" && permission.contacts !== "limited") {
      const requested = await Contacts.requestPermissions();
      if (requested.contacts !== "granted" && requested.contacts !== "limited") return null;
    }

    const { contact } = await Contacts.pickContact({
      projection: { name: true, emails: true, phones: true },
    });

    return {
      name: contact.name?.display ?? null,
      email: contact.emails?.[0]?.address ?? null,
      phone: contact.phones?.[0]?.number ?? null,
    };
  } catch {
    // Includes the person cancelling the native picker — that's a normal,
    // expected outcome here, not something to surface as an error.
    return null;
  }
}

// Full address book, for an in-app browsable list rather than the OS's
// own single-pick dialog. Sorted by name (device contact stores don't
// guarantee an order) and filtered down to contacts with an actual name
// and at least one way to reach them — an entry with neither is not
// something anyone could tap to use here anyway. Same permission alias as
// pickNativeContact() above (already covered by the existing
// AndroidManifest.xml/Info.plist declarations — no new permission is
// needed for this).
export async function listNativeContacts(): Promise<PickedContact[]> {
  if (!Capacitor.isNativePlatform()) return [];

  try {
    const { Contacts } = await import("@capacitor-community/contacts");

    const permission = await Contacts.checkPermissions();
    if (permission.contacts !== "granted" && permission.contacts !== "limited") {
      const requested = await Contacts.requestPermissions();
      if (requested.contacts !== "granted" && requested.contacts !== "limited") return [];
    }

    const { contacts } = await Contacts.getContacts({
      projection: { name: true, emails: true, phones: true },
    });

    return contacts
      .map((contact) => ({
        name: contact.name?.display ?? null,
        email: contact.emails?.[0]?.address ?? null,
        phone: contact.phones?.[0]?.number ?? null,
      }))
      .filter((c): c is PickedContact & { name: string } => Boolean(c.name && (c.email || c.phone)))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } catch {
    return [];
  }
}
