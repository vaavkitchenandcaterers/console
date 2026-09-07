// Google Analytics 4 — the configuration half of the gtag snippet.
//
// This lives in a file rather than inline in every <head> so that `script-src`
// stays free of `'unsafe-inline'` (and free of a per-page hash that eleven
// copies of the CSP would have to keep in sync). The loader half stays in the
// HTML: <script async src="https://www.googletagmanager.com/gtag/js?id=…">.
//
// The measurement ID is public by design — it identifies the property to
// Google's collection endpoint and grants nothing. It is not a secret, and is
// the one exception to the "no keys in the client" rule in the README.
//
// Order does not matter. The loader is async, so it may run before or after
// this file; either way `window.dataLayer` is the queue both sides agree on,
// and re-defining `gtag` as a push shim is what the canonical snippet leaves
// in place regardless.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-4T5PCVFK2G');
