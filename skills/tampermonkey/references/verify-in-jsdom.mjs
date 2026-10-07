import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Verifies the reference boilerplate's DOM logic against a simulated page,
// without needing a real browser or the Tampermonkey extension.
// Usage: node verify-in-jsdom.mjs [path-to-userscript]  (defaults to boilerplate.user.js)
const scriptPath =
  process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), 'boilerplate.user.js');
const scriptSource = readFileSync(scriptPath, 'utf8');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.com/app',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.console = console;
global.MutationObserver = window.MutationObserver;

console.log('--- STEP 1: run script before target element exists ---');
window.eval(scriptSource);
console.log(
  'doc init attr right after load:',
  document.documentElement.getAttribute('data-boilerplate-initialized'),
);

setTimeout(() => {
  console.log('--- STEP 2: insert target element (simulates late-loaded content) ---');
  const target = document.createElement('div');
  target.id = 'example-target';
  target.textContent = 'hello';
  document.body.appendChild(target);

  setTimeout(() => {
    console.log('target classList after insertion:', target.className);
    console.log('target has init flag:', target.hasAttribute('data-boilerplate-initialized'));

    console.log(
      '--- STEP 3: insert an unrelated node, confirm no duplicate "Feature applied" log ---',
    );
    const originalLog = console.log;
    let featureLogCount = 0;
    console.log = (...args) => {
      if (args[1] === 'Feature applied to target element.') featureLogCount += 1;
      originalLog(...args);
    };
    document.body.appendChild(document.createElement('p'));

    setTimeout(() => {
      console.log = originalLog;
      console.log(
        'extra "Feature applied" logs from unrelated mutation (expected 0):',
        featureLogCount,
      );

      console.log('--- STEP 4: simulate SPA navigation (URL change) ---');
      const flagBeforeNav = document.documentElement.getAttribute('data-boilerplate-initialized');
      dom.reconfigure({ url: 'https://example.com/app/other-view' });
      document.body.appendChild(document.createElement('span')); // triggers the body MutationObserver

      setTimeout(() => {
        const flagAfterNav = document.documentElement.getAttribute('data-boilerplate-initialized');
        console.log(
          'init flag before nav-triggering mutation:',
          flagBeforeNav,
          '-> after:',
          flagAfterNav,
          '(expected: still "true", meaning it was reset then re-set by initialize())',
        );
        console.log('--- DONE ---');
        process.exit(0);
      }, 50);
    }, 50);
  }, 50);
}, 50);
