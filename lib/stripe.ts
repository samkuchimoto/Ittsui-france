// /lib/stripe.ts
// Server-side Stripe client — used only inside app/api/stripe/** routes.
// Same lazy-init reasoning as lib/firebaseAdmin.ts's adminDb: `new
// Stripe(undefined)` throws synchronously if STRIPE_SECRET_KEY isn't set,
// and Next.js's build step imports every route module to collect route
// metadata without ever calling the handlers — eager construction here
// would make `next build` itself require a real Stripe secret just to
// *import* this file, breaking in any clean checkout with no secrets
// configured. The Proxy defers construction until a property is actually
// accessed at request time.

import Stripe from "stripe";

function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance as object, prop, receiver);
    },
  });
}

// .trim() is load-bearing, not defensive paranoia: a real production
// failure (2026-08-28) traced to a literal ERR_INVALID_CHAR from Node's
// http client building the Authorization header — the key value, pasted
// into Vercel's dashboard UI by hand, carried a trailing newline/whitespace
// character invisible in the UI. Node's setHeader rejects control
// characters in header values outright.
export const stripe: Stripe = lazy(
  () =>
    new Stripe((process.env.STRIPE_SECRET_KEY as string).trim(), {
      apiVersion: "2026-08-26.dahlia",
    })
);
