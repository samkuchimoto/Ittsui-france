import type { CapacitorConfig } from "@capacitor/cli";

// Ittsui is a server-rendered Next.js app (API routes, firebase-admin on
// the server) — not a static site, so there's nothing to bundle into the
// native shell the way a plain static-export app would. The correct
// Capacitor pattern here is a remote-URL wrapper: the native WebView
// loads the real deployed site directly, so every API route, every
// Firebase Admin call, and every future deploy work exactly as they do
// on the web — zero duplicated logic, per the brief. webDir still has to
// point at a real directory (Capacitor's CLI checks it exists) even
// though server.url means it's never actually served from.
const config: CapacitorConfig = {
  appId: "fr.ittsui.app",
  appName: "Ittsui",
  webDir: "public",
  server: {
    url: "https://ittsui.fr",
    cleartext: false,
    // allowNavigation lets the WebView follow links this app already
    // generates (invite links, decline links) without leaving the app.
    allowNavigation: ["ittsui.fr", "*.ittsui.fr", "accounts.google.com", "*.googleapis.com"],
  },
};

export default config;
