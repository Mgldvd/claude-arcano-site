// ==UserScript==
// @name         Boilerplate
// @description  Reference skeleton for idempotent, SPA-safe Tampermonkey userscripts
// @namespace    urn:local:userscript:boilerplate
// @version      0.1
// @match        <URL>
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const SCRIPT_TAG = '[Boilerplate]';
  const INIT_FLAG = 'data-boilerplate-initialized';
  const WAIT_FOR_ELEMENT_TIMEOUT_MS = 10000;

  let bodyObserver = null;
  let lastUrl = window.location.href;

  // Logs a script-prefixed message so console output stays identifiable among other extensions/scripts.
  const log = (...args) => console.log(SCRIPT_TAG, ...args);

  // Logs a script-prefixed warning without throwing, keeping failures non-fatal to the host page.
  const warn = (...args) => console.warn(SCRIPT_TAG, ...args);

  // Resolves once a selector matches an element, or rejects after timeoutMs to avoid an unbounded wait.
  const waitForElement = (selector, timeoutMs = WAIT_FOR_ELEMENT_TIMEOUT_MS) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (!element) {
          return;
        }
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timed out waiting for "${selector}"`));
      }, timeoutMs);

      observer.observe(document.body, { childList: true, subtree: true });
    });

  // Injects the script's stylesheet once, guarding against duplicate <style> tags on re-init.
  const injectStyles = () => {
    const styleId = 'boilerplate-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .boilerplate-highlight {
        outline: 2px solid #f59e0b;
      }
    `;
    document.head.appendChild(style);
  };

  // Placeholder for the script's actual DOM work; replace with real selectors and behavior.
  const applyFeature = async () => {
    try {
      const target = await waitForElement('#example-target');
      if (target.hasAttribute(INIT_FLAG)) {
        return;
      }
      target.setAttribute(INIT_FLAG, 'true');
      target.classList.add('boilerplate-highlight');
      log('Feature applied to target element.');
    } catch (error) {
      warn('Could not locate target element:', error.message);
    }
  };

  // Runs the script's full setup: styles plus feature logic. Safe to call multiple times.
  const initialize = () => {
    if (document.documentElement.hasAttribute(INIT_FLAG)) {
      return;
    }
    document.documentElement.setAttribute(INIT_FLAG, 'true');

    injectStyles();
    applyFeature();
  };

  // Detects SPA navigation (URL changes without a full reload) and re-runs initialization for the new view.
  const handlePotentialNavigation = () => {
    if (window.location.href === lastUrl) {
      return;
    }
    lastUrl = window.location.href;
    document.documentElement.removeAttribute(INIT_FLAG);
    initialize();
  };

  // Watches the document for structural changes, used both to catch late-loaded content and SPA route changes.
  const startObserving = () => {
    if (bodyObserver) {
      return;
    }
    bodyObserver = new MutationObserver(() => {
      handlePotentialNavigation();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  };

  // Disconnects observers on page unload to avoid leaking callbacks past the page's lifetime.
  const teardown = () => {
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
  };

  initialize();
  startObserving();
  window.addEventListener('pagehide', teardown, { once: true });
})();
