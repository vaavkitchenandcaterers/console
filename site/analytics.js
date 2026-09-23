// Google Analytics 4: the configuration half of the gtag snippet, and the
// loader that used to sit in every <head>.
//
// This lives in a file rather than inline in every <head> so that `script-src`
// stays free of `'unsafe-inline'` (and free of a per-page hash that eleven
// copies of the CSP would have to keep in sync). See ADR-0009.
//
// The measurement ID is public by design: it identifies the property to
// Google's collection endpoint and grants nothing. It is not a secret, and is
// the one exception to the "no keys in the client" rule in the README.
//
// WHY THE LOADER IS NO LONGER IN THE HTML (ADR-0012). As an `async` tag in the
// head it was 172 KiB and about 1.1 s of main-thread work on a mid-range
// phone -- the largest single cost left on the page -- and it spent that while
// the hero was still competing for the same network and main thread. It is
// fetched from here instead, once the page has painted or the moment the
// visitor touches it.
//
// WHAT IS NOT DEFERRED: the two commands below. `dataLayer` is a queue, so
// `js` and `config` are issued immediately, exactly as before, and every lead
// event script.js fires queues the same way. Nothing is dropped for being
// early -- the queue is drained in order when the library arrives, which is
// the same mechanism that already covered an async loader arriving late.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-4T5PCVFK2G');

(function () {
  var LOADER = 'https://www.googletagmanager.com/gtag/js?id=G-4T5PCVFK2G';

  // Whichever of these comes first wins; the rest are torn down. A visitor who
  // scrolls or taps is counted at that moment, and one who only reads is
  // counted once the main thread goes idle after load.
  //
  // The 3 s is a ceiling, not a delay: requestIdleCallback fires as soon as the
  // thread is free, which on a quick device is straight after the paint. The
  // ceiling only bites when the thread is still busy -- which is exactly when
  // adding 172 KiB of script would hurt. At 1.5 s two runs in seven landed the
  // fetch on top of a hero still painting and cost ~1.9 s of LCP.
  var TRIGGERS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
  var IDLE_AFTER_LOAD_MS = 3000;
  var loading = false;

  function load() {
    if (loading) return;
    loading = true;
    TRIGGERS.forEach(function (type) {
      window.removeEventListener(type, load, { capture: true });
    });
    document.removeEventListener('visibilitychange', onHidden);
    var s = document.createElement('script');
    s.async = true;
    s.src = LOADER;
    document.head.appendChild(s);
  }

  // Leaving early is the one case deferral can lose. Starting the fetch as the
  // page is hidden does not always finish -- a closed tab stops it -- but a
  // backgrounded or navigated-away page usually does.
  function onHidden() {
    if (document.visibilityState === 'hidden') load();
  }

  function afterLoad() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: IDLE_AFTER_LOAD_MS });
    } else {
      setTimeout(load, IDLE_AFTER_LOAD_MS);
    }
  }

  TRIGGERS.forEach(function (type) {
    // Passive, and capturing, so a handler that stops propagation cannot hide
    // the interaction from this one.
    window.addEventListener(type, load, { passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', onHidden);

  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad);
})();
