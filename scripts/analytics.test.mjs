import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Load the same browser module without changing the CommonJS package boundary;
// injection keeps these lifecycle tests offline and avoids importing the SDK.
const source = await readFile(new URL("../src/scripts/analytics.js", import.meta.url), "utf8");
const { startAnalytics, sanitizeEvent, campaignProperties, articleDepth, pageProperties } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

class Target {
  listeners = new Map();
  addEventListener(name, fn) { const list = this.listeners.get(name) || []; list.push(fn); this.listeners.set(name, list); }
  removeEventListener(name, fn) { this.listeners.set(name, (this.listeners.get(name) || []).filter((entry) => entry !== fn)); }
  dispatch(name, event = {}) { for (const fn of [...(this.listeners.get(name) || [])]) fn({ type: name, ...event }); }
}

function harness({ url = "https://sergei-parfenov.com/blog/test-article/", pageType = "article", body = true, navigator = {} } = {}) {
  let time = 0, focused = true, nextId = 0, imports = 0, options;
  const events = [], intervals = new Map(), timeouts = new Map(), idle = new Map();
  const win = new Target(), doc = new Target();
  win.location = new URL(url);
  win.navigator = navigator;
  win.innerHeight = 800;
  win.performance = { now: () => time };
  win.crypto = { randomUUID: () => `view-${++nextId}` };
  let timerId = 0;
  win.setInterval = (fn) => { intervals.set(++timerId, fn); return timerId; };
  win.clearInterval = (id) => intervals.delete(id);
  win.setTimeout = (fn) => { timeouts.set(++timerId, fn); return timerId; };
  win.clearTimeout = (id) => timeouts.delete(id);
  win.requestIdleCallback = (fn) => { idle.set(++timerId, fn); return timerId; };
  win.cancelIdleCallback = (id) => idle.delete(id);
  // Any accidental application-side storage access fails immediately.
  Object.defineProperties(win, {
    localStorage: { get() { throw new Error("localStorage is forbidden"); } },
    sessionStorage: { get() { throw new Error("sessionStorage is forbidden"); } },
  });
  doc.body = { dataset: { analyticsPageType: pageType, analyticsContentKey: pageType === "article" ? "article:test-article" : pageType,
    analyticsArticleSlug: pageType === "article" ? "test-article" : undefined, analyticsLocale: "en" } };
  doc.visibilityState = "visible";
  doc.referrer = "https://example.org/private/path?email=secret@example.org#secret";
  doc.hasFocus = () => focused;
  const rect = { top: 310, height: 1000 };
  doc.querySelector = () => body ? { getBoundingClientRect: () => rect } : null;
  const sdk = {
    init(key, config) {
      options = config;
      assert.equal(key, "public-test-key");
      win.addEventListener("pagehide", () => sdk.capture("$pageleave"));
      config.loaded(sdk);
    },
    capture(event, properties = {}, captureOptions = {}) {
      const cleaned = options.before_send({ event, timestamp: captureOptions.timestamp,
        $set: { $current_url: win.location.href }, $set_once: { $initial_referrer: doc.referrer },
        properties: { token: "public-test-key", distinct_id: "$posthog_cookieless", $cookieless_mode: true,
          $raw_user_agent: "Mozilla/5.0 (Synthetic SDK fixture)",
          $current_url: win.location.href, $referrer: doc.referrer, $initial_current_url: win.location.href,
          $set: { email: "secret@example.org" }, ...properties } });
      if (cleaned) events.push(cleaned);
    },
  };
  const loadSdk = async () => { imports++; return { default: sdk }; };
  const start = () => startAnalytics({ win, doc, key: "public-test-key", loadSdk });
  return { win, doc, rect, sdk, events, start, imports: () => imports, options: () => options,
    advance(ms) { time += ms; for (const fn of intervals.values()) fn(); },
    focus(value) { focused = value; win.dispatch(value ? "focus" : "blur"); },
    visible(value) { doc.visibilityState = value ? "visible" : "hidden"; doc.dispatch("visibilitychange"); },
    runIdle() { for (const fn of idle.values()) fn(); },
  };
}

function anchor(data, href = "https://example.com") {
  const node = { dataset: data, getAttribute: (name) => name === "href" ? href : null };
  return { closest: () => node };
}

test("host, privacy signals and opt-outs prevent SDK import entirely", async () => {
  for (const settings of [
    { url: "http://localhost:3000/?analytics_test=1" },
    { url: "https://resume-preview.vercel.app/?analytics_test=1" },
    { url: "https://sergei-parfenov.com/?analytics=off" },
    { navigator: { globalPrivacyControl: true } }, { navigator: { doNotTrack: "1" } },
  ]) {
    const h = harness(settings);
    assert.equal(h.start(), null);
    h.runIdle();
    await Promise.resolve();
    assert.equal(h.imports(), 0);
  }
  const own = harness();
  own.win.__SERGEI_ANALYTICS_DISABLED__ = true;
  assert.equal(own.start(), null);
  const data = harness();
  data.doc.body.dataset.analyticsDisabled = "true";
  assert.equal(data.start(), null);
});

test("early keyboard CTA is queued after one pageview, repeat initialization adds no handlers", async () => {
  const h = harness({ pageType: "home", url: "https://sergei-parfenov.com/?analytics_test=1&email=secret%40example.com#secret" });
  const controller = h.start();
  assert.equal(h.start(), controller);
  const target = anchor({ analyticsEvent: "contact_clicked", analyticsPlacement: "home_footer" }, "mailto:private@example.com?body=secret");
  h.doc.dispatch("click", { target, button: 0, detail: 0 });
  await controller.load();
  assert.deepEqual(h.events.map((e) => e.event), ["$pageview", "contact_clicked"]);
  assert.equal(h.imports(), 1);
  assert.equal(h.events[1].properties.view_id, h.events[0].properties.view_id);
  assert.equal(h.events[0].properties.environment, "test");
  assert.equal(h.events[1].properties.channel, "email");
  assert.ok(!JSON.stringify(h.events).includes("secret"));
  assert.ok(!JSON.stringify(h.events).includes("private@example"));
  h.doc.dispatch("click", { target, button: 0 });
  assert.equal(h.events.filter((e) => e.event === "contact_clicked").length, 2, "real repeat clicks are retained");
});

test("engagement requires both 30 foreground seconds and 50% of article body", async () => {
  const h = harness(); await h.start().load();
  h.advance(29000);
  assert.equal(h.events.length, 1);
  h.rect.top = 300; // Exactly 50% of article; footer/header do not enter denominator.
  h.win.dispatch("scroll");
  assert.equal(h.events.length, 1);
  h.advance(1000);
  assert.equal(h.events[1].event, "article_engaged");
  assert.equal(h.events[1].properties.foreground_seconds, 30);
  assert.equal(h.events[1].properties.max_article_depth_pct, 50);
  h.advance(60000); h.win.dispatch("scroll");
  assert.equal(h.events.length, 2);
  const shallow = harness(); await shallow.start().load();
  shallow.advance(30000);
  assert.equal(shallow.events.length, 1, "49% never qualifies, even after 30 seconds");
});

test("hidden and unfocused time never accumulates toward engagement", async () => {
  const h = harness(); h.rect.top = 0; await h.start().load();
  h.advance(10000); h.focus(false); h.advance(120000);
  h.focus(true); h.advance(10000); h.visible(false); h.advance(120000);
  h.visible(true); h.advance(9999);
  assert.equal(h.events.length, 1);
  h.advance(1);
  assert.equal(h.events[1].properties.foreground_seconds, 30);
});

test("BFCache creates a new view, engagement resets, repeated pagehide deduplicates pageleave", async () => {
  const h = harness(); h.rect.top = 0; await h.start().load(); h.advance(30000);
  const first = h.events[0].properties.view_id;
  h.win.dispatch("pagehide", { persisted: true });
  h.win.dispatch("pagehide", { persisted: true });
  h.advance(100000);
  h.win.dispatch("pageshow", { persisted: true });
  h.win.dispatch("pageshow", { persisted: false });
  assert.equal(h.events.filter((e) => e.event === "$pageview").length, 2);
  const second = h.events.at(-1).properties.view_id;
  assert.notEqual(first, second);
  assert.equal(h.events.filter((e) => e.event === "$pageleave").length, 1);
  assert.equal(h.events.find((e) => e.event === "$pageleave").properties.view_id, first);
  h.advance(29999); assert.equal(h.events.filter((e) => e.event === "article_engaged").length, 1);
  h.advance(1); assert.equal(h.events.at(-1).properties.view_id, second);
});

test("BFCache before SDK load retains old view metadata in queued events", async () => {
  const h = harness(); const c = h.start();
  h.win.dispatch("pagehide", { persisted: true });
  h.win.dispatch("pageshow", { persisted: true });
  await c.load();
  assert.deepEqual(h.events.map((e) => e.event), ["$pageview", "$pageleave", "$pageview"]);
  assert.equal(h.events[0].properties.view_id, h.events[1].properties.view_id);
  assert.notEqual(h.events[0].properties.view_id, h.events[2].properties.view_id);
});

test("missing article body is observable but cannot generate engagement", async () => {
  const h = harness({ body: false }); await h.start().load(); h.advance(60000);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].properties.article_body_present, false);
});

test("annotated resources are disjoint, unsupported actions and right-clicks are ignored", async () => {
  const h = harness(); await h.start().load();
  const cases = [
    { analyticsEvent: "profile_clicked", analyticsPlatform: "linkedin", analyticsPlacement: "work_footer" },
    { analyticsEvent: "download_clicked", analyticsAssetId: "agent-memory-probe", analyticsFileType: "zip", analyticsPlacement: "article_body" },
    { analyticsEvent: "download_clicked", analyticsAssetId: "ai-test-demo", analyticsFileType: "zip", analyticsPlacement: "article_body" },
    { analyticsEvent: "rss_clicked", analyticsFeedId: "main", analyticsPlacement: "blog_tools" },
  ];
  for (const data of cases) h.doc.dispatch("click", { target: anchor(data), button: 0 });
  assert.deepEqual(h.events.slice(1).map((e) => e.event), ["profile_clicked", "download_clicked", "download_clicked", "rss_clicked"]);
  h.doc.dispatch("click", { target: anchor(cases[0]), button: 2 });
  h.doc.dispatch("click", { target: anchor({ ...cases[1], analyticsAssetId: "unknown" }) });
  h.doc.dispatch("click", { target: anchor(cases[0]), defaultPrevented: true });
  assert.equal(h.events.length, 5);
  h.doc.dispatch("auxclick", { target: anchor(cases[0]), button: 1 });
  assert.equal(h.events.length, 6, "middle click is one activation");
});

test("scrubber rejects unknown events and strips URL, DOM and person payloads at both levels", () => {
  const context = { common: { page_path: "/blog/a/", view_id: "new", analytics_mode: "cookieless" },
    origin: "https://sergei-parfenov.com", referrer: "https://example.org/private?email=private@example.org#private" };
  assert.equal(sanitizeEvent({ event: "$autocapture" }, context), null);
  const event = sanitizeEvent({ event: "$pageview", uuid: "event-uuid", $set: { email: "private" },
    $set_once: { $initial_current_url: "private" }, properties: {
      distinct_id: "$posthog_cookieless", $cookieless_mode: true, token: "public",
      page_path: "/es/", view_id: "old", $current_url: "private", $referrer: "private", $initial_current_url: "private",
      $set: { private: "private" }, $set_once: { private: "private" }, $elements: ["private"], $title: "private",
      utm_source: "newsletter", utm_content: "private@example.com", unknown: "private",
    } }, context);
  assert.equal(event.properties.view_id, "old");
  assert.equal(event.properties.$current_url, "https://sergei-parfenov.com/es/");
  assert.equal(event.properties.$referrer, "https://example.org/");
  assert.equal(event.properties.$cookieless_mode, true);
  assert.equal(event.properties.distinct_id, "$posthog_cookieless");
  assert.equal(event.properties.utm_source, "newsletter");
  assert.ok(!JSON.stringify(event).includes("private"));
});

test("campaigns and locale metadata use bounded identifiers, never arbitrary query values", () => {
  assert.deepEqual(campaignProperties("?utm_source=dev&email=a%40b.com&utm_campaign=launch_2026&utm_term=a%40b.com&utm_medium=https%3A%2F%2Fexample.com"), { utm_source: "dev", utm_campaign: "launch_2026" });
  const h = harness({ pageType: "home", url: "https://sergei-parfenov.com/es/?private=1" });
  h.doc.body.dataset.analyticsLocale = "es";
  const p = pageProperties(h.win, h.doc, "view");
  assert.equal(p.content_key, "home"); assert.equal(p.page_locale, "es"); assert.equal(p.page_path, "/es/");
  assert.ok(!("article_slug" in p));
  h.doc.body.dataset.analyticsPageType = "invented";
  assert.equal(h.start(), null);
  assert.equal(articleDepth({ top: 0, height: 300 }, 800), 100);
  assert.equal(articleDepth({ top: 1000, height: 300 }, 800), 0);
});

test("cookieless transport retains the SDK user agent required by the server ingestion contract", async () => {
  // PostHog's cookieless-manager.getProperties reads $raw_user_agent and $host
  // from event properties; a missing UA drops the event AFTER HTTP acceptance.
  // https://github.com/PostHog/posthog/blob/master/nodejs/src/ingestion/common/cookieless/cookieless-manager.ts
  const h = harness(); await h.start().load();
  const event = h.events[0];
  assert.equal(event.properties.$raw_user_agent, "Mozilla/5.0 (Synthetic SDK fixture)");
  assert.equal(event.properties.$host, "sergei-parfenov.com");
  assert.equal(event.properties.$cookieless_mode, true);
  assert.equal(event.properties.distinct_id, "$posthog_cookieless");
  assert.equal(event.properties.token, "public-test-key");
  assert.ok(event.timestamp instanceof Date);
  assert.ok(!("$set" in event));
  assert.ok(!("$set_once" in event));
  assert.ok(!JSON.stringify(event).includes("secret"));
});

test("SDK config is cookieless, manual pageviews and no optional products; runtime opt-out rejects later sends", async () => {
  const h = harness(); await h.start().load();
  const config = h.options();
  assert.equal(config.cookieless_mode, "always"); assert.equal(config.persistence, "memory");
  assert.equal(config.disable_persistence, true); assert.equal(config.person_profiles, "never");
  assert.equal(config.capture_pageview, false); assert.equal(config.capture_pageleave, true);
  assert.equal(config.advanced_disable_flags, true); assert.equal(config.disable_external_dependency_loading, true);
  for (const key of ["autocapture", "capture_dead_clicks", "capture_exceptions", "capture_heatmaps", "capture_performance"]) assert.equal(config[key], false);
  h.win.navigator.globalPrivacyControl = true;
  h.sdk.capture("contact_clicked", { channel: "email" });
  assert.equal(h.events.length, 1);
});

test("SDK failure is isolated from native link activation", async () => {
  const h = harness();
  const controller = startAnalytics({ win: h.win, doc: h.doc, key: "public-test-key", loadSdk: async () => { throw new Error("blocked"); } });
  await assert.doesNotReject(controller.load());
  assert.doesNotThrow(() => h.doc.dispatch("click", { target: anchor({ analyticsEvent: "rss_clicked", analyticsFeedId: "main", analyticsPlacement: "blog_tools" }) }));
  controller.stop();
});
