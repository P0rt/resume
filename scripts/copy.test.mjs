import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../src/scripts/main.js", import.meta.url), "utf8");
function setup({ fail = false } = {}) {
  const code = 'print("<hello> & goodbye")\n  # indentation';
  const timers = [];
  const copied = [];
  const status = { textContent: "" };
  const button = (label) => ({
    textContent: label, hidden: true, disabled: false, dataset: {},
    addEventListener(event, callback) { this.click = callback; },
    closest() { return { querySelector: () => ({ textContent: code }) }; },
  });
  const codeButton = button("Copy code");
  const linkButton = button("Copy link");
  vm.runInNewContext(script, {
    document: { querySelectorAll(selector) { return ({ "[data-copy-code]": [codeButton], "[data-copy-url]": [linkButton], ".copy-status": [status] })[selector] || []; } },
    navigator: { clipboard: { async writeText(text) { if (fail) throw new Error("Permission denied"); copied.push(text); } } },
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      location: { href: "https://sergei-parfenov.com/blog/example/#section" },
      setTimeout(callback) { timers.push(callback); },
    },
  });
  return { code, copied, status, codeButton, linkButton, reset: () => timers.splice(0).forEach((callback) => callback()) };
}

test("code copying preserves text, announces success and restores the control", async () => {
  const page = setup();
  assert.equal(page.codeButton.hidden, false);
  await page.codeButton.click();
  assert.deepEqual(page.copied, [page.code]);
  assert.equal(page.codeButton.textContent, "Copied");
  assert.equal(page.codeButton.disabled, true);
  assert.equal(page.status.textContent, "Copied to clipboard.");
  page.reset();
  assert.equal(page.codeButton.textContent, "Copy code");
  assert.equal(page.codeButton.disabled, false);
  assert.equal(page.status.textContent, "");
});

test("copying an article link retains the current section fragment", async () => {
  const page = setup();
  assert.equal(page.linkButton.hidden, false);
  await page.linkButton.click();
  assert.deepEqual(page.copied, ["https://sergei-parfenov.com/blog/example/#section"]);
  page.reset();
  assert.equal(page.linkButton.textContent, "Copy link");
});

test("clipboard denial gives accessible feedback and allows a retry", async () => {
  const page = setup({ fail: true });
  await page.codeButton.click();
  assert.equal(page.codeButton.textContent, "Copy failed");
  assert.match(page.status.textContent, /Select the text and copy it manually/);
  assert.deepEqual(page.copied, []);
  page.reset();
  assert.equal(page.codeButton.disabled, false);
  assert.equal(page.codeButton.textContent, "Copy code");
});
