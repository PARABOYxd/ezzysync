/**
 * Error Monitor
 * Captures console errors, page crashes, and HTTP failures (status >= 400).
 */

export class ErrorMonitor {
  constructor() {
    this.consoleErrors = [];
    this.networkErrors = [];
    this.pageErrors = [];
  }

  attach(page) {
    // 1. Uncaught JS page exceptions
    page.on('pageerror', (err) => {
      this.pageErrors.push({
        timestamp: new Date().toISOString(),
        url: page.url(),
        message: err.message || String(err),
        stack: err.stack,
      });
    });

    // 2. Severe console errors (ignore benign React/Vite development notices)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out non-critical harmless network noise if any
        if (
          !text.includes('[vite]') &&
          !text.includes('Download the React DevTools') &&
          !text.includes('favicon.ico')
        ) {
          this.consoleErrors.push({
            timestamp: new Date().toISOString(),
            url: page.url(),
            text,
          });
        }
      }
    });

    // 3. Network request failures (dropped connection, timeout)
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      // Ignore canceled requests (e.g. aborted on page navigation)
      if (failure && !failure.errorText.includes('net::ERR_ABORTED')) {
        this.networkErrors.push({
          timestamp: new Date().toISOString(),
          url: req.url(),
          method: req.method(),
          error: failure.errorText,
        });
      }
    });

    // 4. HTTP error responses (>= 400)
    page.on('response', async (res) => {
      const status = res.status();
      if (status >= 400) {
        // Exclude 401 when expecting initial unauthorized redirect or deliberate negative auth tests
        let bodySnippet = '';
        try {
          bodySnippet = (await res.text()).slice(0, 300);
        } catch {
          // ignore stream read error
        }

        this.networkErrors.push({
          timestamp: new Date().toISOString(),
          url: res.url(),
          method: res.request().method(),
          status,
          statusText: res.statusText(),
          responseSnippet: bodySnippet,
        });
      }
    });
  }

  getErrors() {
    return {
      pageErrors: [...this.pageErrors],
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
    };
  }

  clear() {
    this.pageErrors = [];
    this.consoleErrors = [];
    this.networkErrors = [];
  }
}
