import { NextResponse } from 'next/server'

// Serves a self-contained HTML page that loads AppLixir inside an iframe.
// The parent modal embeds this via <iframe> — AppLixir is sandboxed inside
// the iframe document and cannot escape to fullscreen the parent page.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get('apiKey') ?? ''
  const lang = searchParams.get('lang') ?? 'fr'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  #applixir_vanishing_div {
    width: 100%;
    height: 100%;
    position: relative;
  }
  /* Force any injected children (iframe, video, div) to fill the container */
  #applixir_vanishing_div > * {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important; height: 100% !important;
  }
  #applixir_vanishing_div iframe,
  #applixir_vanishing_div video {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important; height: 100% !important;
    border: none !important;
  }
</style>
</head>
<body>
  <div id="applixir_vanishing_div"></div>
  <script src="/api/applixir-sdk"></script>
  <script>
    var attempts = 0;
    var maxAttempts = 40;
    function tryInit() {
      if (typeof initializeAndOpenPlayer === 'function') {
        initializeAndOpenPlayer({
          apiKey: '${apiKey}',
          injectionElementId: 'applixir_vanishing_div',
          adStatusCallbackFn: function(status) {
            window.parent.postMessage({ type: 'applixir_status', status: status }, '*');
          },
          adErrorCallbackFn: function(err) {
            window.parent.postMessage({ type: 'applixir_error', error: String(err) }, '*');
          }
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryInit, 250);
      } else {
        window.parent.postMessage({ type: 'applixir_error', error: 'SDK not loaded' }, '*');
      }
    }
    // Wait for script to load then init
    document.querySelector('script[src="/api/applixir-sdk"]').addEventListener('load', tryInit);
    document.querySelector('script[src="/api/applixir-sdk"]').addEventListener('error', function() {
      window.parent.postMessage({ type: 'applixir_error', error: 'SDK load failed' }, '*');
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Allow same-origin iframes + allow scripts/popups needed by IMA SDK
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
