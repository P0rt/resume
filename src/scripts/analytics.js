// Deliberately separate from the site's progressive enhancements. No browser
// storage, identity, DOM text, or arbitrary URL parameters belong in this layer.
const HOSTS = new Set(["sergei-parfenov.com", "www.sergei-parfenov.com"]);
const PAGE_TYPES = new Set(["home", "work_together", "blog_index", "article", "privacy", "not_found"]);
const EVENTS = new Set(["$pageview", "$pageleave", "article_engaged", "contact_clicked", "profile_clicked", "download_clicked", "rss_clicked"]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const INSTANCE = Symbol.for("sergei.analytics.v1");
const PUBLIC_KEY = typeof __POSTHOG_PUBLIC_KEY__ === "string" ? __POSTHOG_PUBLIC_KEY__ : "";
const SDK_PROPERTIES = new Set([
  "token", "distinct_id", "$cookieless_mode", "$lib", "$lib_version", "$config_defaults",
  // The server requires this SDK field for cookieless hashing, then removes it
  // before storing the event. Dropping it here silently loses every event.
  "$raw_user_agent", "$browser", "$browser_version", "$os", "$os_version", "$device_type", "$screen_height",
  "$screen_width", "$viewport_height", "$viewport_width", "$pageview_id", "$prev_pageview_id",
  "$prev_pageview_duration", "$session_id", "$window_id", "$is_identified", "$process_person_profile",
]);
const OWN_PROPERTIES = new Set([
  "schema_version", "page_type", "page_path", "content_key", "page_locale", "article_slug", "view_id",
  "environment", "analytics_mode", "foreground_seconds", "max_article_depth_pct", "channel", "placement",
  "platform", "asset_id", "file_type", "feed_id", "article_body_present", ...UTM_KEYS,
]);

export function safePath(pathname) {
  // Unknown/404 routes can contain user-supplied values too.
  return String(pathname || "/").split("/").map((part) => {
    let decoded;
    try { decoded = decodeURIComponent(part); } catch { return "redacted"; }
    return /[@?#\s]/.test(decoded) || part.length > 180 ? "redacted" : part;
  }).join("/");
}

export function campaignProperties(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(UTM_KEYS.flatMap((key) => {
    const value = params.get(key);
    // Campaign identifiers, not free-form text, emails, or destination URLs.
    return value && /^[a-zA-Z0-9_.~-]{1,100}$/.test(value) ? [[key, value]] : [];
  }));
}

function referrerProperties(referrer) {
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol)) return {};
    return { $referrer: url.origin + "/", $referring_domain: url.hostname };
  } catch { return {}; }
}

export function collectionAllowed(win, doc) {
  const params = new URLSearchParams(win.location.search);
  return win.location.protocol === "https:" && HOSTS.has(win.location.hostname)
    && params.get("analytics") !== "off"
    && win.__SERGEI_ANALYTICS_DISABLED__ !== true
    && doc.body?.dataset.analyticsDisabled !== "true"
    && win.navigator.globalPrivacyControl !== true
    && !["1", "yes"].includes(String(win.navigator.doNotTrack || win.doNotTrack || "").toLowerCase());
}

export function pageProperties(win, doc, viewId) {
  const data = doc.body?.dataset || {};
  if (!PAGE_TYPES.has(data.analyticsPageType)) return null;
  const slug = data.analyticsArticleSlug;
  const locale = data.analyticsLocale;
  if (!/^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(locale || "")) return null;
  if (data.analyticsPageType === "article" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")) return null;
  const contentKey = data.analyticsPageType === "article" ? `article:${slug}` : data.analyticsPageType;
  if (data.analyticsContentKey !== contentKey) return null;
  return {
    schema_version: 1, page_type: data.analyticsPageType,
    page_path: safePath(win.location.pathname), content_key: contentKey, page_locale: locale,
    ...(data.analyticsPageType === "article" ? { article_slug: slug } : {}),
    view_id: viewId, environment: new URLSearchParams(win.location.search).get("analytics_test") === "1" ? "test" : "production",
    analytics_mode: "cookieless",
  };
}

export function sanitizeEvent(event, context) {
  if (!event || !EVENTS.has(event.event) || !context) return null;
  let properties = {};
  for (const [key, value] of Object.entries(event.properties || {})) {
    // Drop nested structures ($set/$set_once included), DOM strings, SDK initial
    // attribution, unknown future SDK properties, and all unsanitized URLs.
    if ((SDK_PROPERTIES.has(key) || OWN_PROPERTIES.has(key))
      && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      && !(typeof value === "number" && !Number.isFinite(value))) properties[key] = value;
  }
  for (const key of UTM_KEYS) {
    if (!/^[a-zA-Z0-9_.~-]{1,100}$/.test(String(properties[key] || ""))) delete properties[key];
  }
  // Preserve queued event metadata across a BFCache reactivation.
  properties = { ...context.common, ...properties };
  properties.$current_url = context.origin + safePath(properties.page_path);
  properties.$pathname = safePath(properties.page_path);
  properties.page_path = properties.$pathname;
  properties.$host = new URL(context.origin).hostname;
  Object.assign(properties, referrerProperties(context.referrer));
  properties.$process_person_profile = false;
  // Person-property updates live at the top level in posthog-js too.
  return { event: event.event, properties, ...(event.uuid ? { uuid: event.uuid } : {}),
    ...(event.timestamp ? { timestamp: event.timestamp } : {}) };
}

export function actionProperties(anchor) {
  const d = anchor?.dataset || {};
  const event = d.analyticsEvent;
  const placement = d.analyticsPlacement;
  if (event === "contact_clicked" && ["home_footer", "work_primary"].includes(placement)
    && anchor.getAttribute("href")?.startsWith("mailto:")) {
    return { event, properties: { channel: "email", placement } };
  }
  if (event === "profile_clicked" && ["linkedin", "github", "dev"].includes(d.analyticsPlatform)
    && ["home_footer", "work_footer", "blog_tools", "blog_footer"].includes(placement)) {
    return { event, properties: { platform: d.analyticsPlatform, placement } };
  }
  if (event === "download_clicked" && ["agent-memory-probe", "ai-test-demo"].includes(d.analyticsAssetId)
    && d.analyticsFileType === "zip" && placement === "article_body") {
    return { event, properties: { asset_id: d.analyticsAssetId, file_type: "zip", placement } };
  }
  if (event === "rss_clicked" && d.analyticsFeedId === "main" && placement === "blog_tools") {
    return { event, properties: { feed_id: "main", placement } };
  }
  return null;
}

export function articleDepth(rect, viewportHeight) {
  if (!rect || rect.height <= 0) return 0;
  return Math.max(0, Math.min(100, (viewportHeight - rect.top) / rect.height * 100));
}

export function sdkOptions(beforeSend, loaded) {
  return {
    api_host: "https://eu.i.posthog.com", ui_host: "https://eu.posthog.com", defaults: "2026-08-30",
    cookieless_mode: "always", persistence: "memory", disable_persistence: true, person_profiles: "never",
    capture_pageview: false, capture_pageleave: true, autocapture: false, rageclick: false,
    capture_dead_clicks: false, capture_exceptions: false, capture_heatmaps: false, capture_performance: false,
    disable_session_recording: true, disable_surveys: true, disable_conversations: true, disable_product_tours: true,
    disable_web_experiments: true, disable_external_dependency_loading: true, advanced_disable_flags: true,
    save_campaign_params: false, save_referrer: false, disable_scroll_properties: true,
    mask_all_text: true, mask_all_element_attributes: true, enable_recording_console_log: false,
    session_idle_timeout_seconds: 1800, respect_dnt: true, debug: false,
    request_batching: true, before_send: beforeSend, loaded,
  };
}

export function startAnalytics({ win = window, doc = document, key = PUBLIC_KEY,
  loadSdk = () => import("posthog-js/dist/module.slim.no-external.js"),
  now = () => win.performance.now(), newId = () => win.crypto.randomUUID(),
} = {}) {
  if (win[INSTANCE]) return win[INSTANCE];
  if (!key || !collectionAllowed(win, doc)) return null;
  if (!pageProperties(win, doc, "validation")) return null;

  let common, article, sdk, loading, stopped = false, suspended = false;
  let foregroundMs = 0, lastTick = now(), wasForeground = false, maxDepth = 0, engaged = false;
  let pending = [], idleHandle, fallbackHandle;
  const pageleaves = new Set();
  const listeners = [];
  const listen = (target, name, handler) => {
    target.addEventListener(name, handler, { passive: true });
    listeners.push(() => target.removeEventListener(name, handler));
  };
  const foreground = () => !suspended && doc.visibilityState === "visible" && doc.hasFocus();
  const context = () => ({ common, origin: win.location.origin, referrer: doc.referrer });
  const beforeSend = (event) => {
    if (stopped || !collectionAllowed(win, doc)) return null;
    if (event?.event === "$pageleave") {
      const id = event.properties?.view_id || common.view_id;
      if (pageleaves.has(id)) return null;
      pageleaves.add(id);
    }
    return sanitizeEvent(event, context());
  };
  const capture = (event, properties = {}) => {
    if (stopped || !collectionAllowed(win, doc)) return;
    const item = { event, properties: { ...common, ...properties }, timestamp: new Date() };
    if (sdk) sdk.capture(item.event, item.properties, { timestamp: item.timestamp });
    else if (pending.length < 100) pending.push(item);
  };
  const activate = () => {
    common = pageProperties(win, doc, newId());
    article = common.page_type === "article" ? doc.querySelector("[data-article-body]") : null;
    foregroundMs = 0; maxDepth = 0; engaged = false; suspended = false;
    lastTick = now(); wasForeground = foreground();
    capture("$pageview", { ...campaignProperties(win.location.search),
      ...(common.page_type === "article" ? { article_body_present: !!article } : {}) });
    tick();
  };
  const tick = () => {
    const time = now();
    if (wasForeground) foregroundMs += Math.max(0, time - lastTick);
    lastTick = time;
    wasForeground = foreground();
    if (article && wasForeground) maxDepth = Math.max(maxDepth, articleDepth(article.getBoundingClientRect(), win.innerHeight));
    if (article && !engaged && foregroundMs >= 30000 && maxDepth >= 50) {
      engaged = true;
      capture("article_engaged", { foreground_seconds: Math.floor(foregroundMs / 1000), max_article_depth_pct: Math.round(maxDepth * 10) / 10 });
    }
  };
  const load = () => {
    if (loading || stopped) return loading;
    loading = Promise.resolve().then(() => {
      if (!collectionAllowed(win, doc)) return null;
      return loadSdk();
    }).then((module) => {
      if (!module || stopped || !collectionAllowed(win, doc)) return;
      const instance = module.default || module;
      instance.init(key, sdkOptions(beforeSend, (ready) => {
        if (stopped) return;
        sdk = ready;
        const queued = pending;
        pending = [];
        for (const item of queued) sdk.capture(item.event, item.properties, { timestamp: item.timestamp });
      }));
    }).catch(() => { pending = []; }); // Analytics failure must not affect the page.
    return loading;
  };
  const onClick = (event) => {
    if (event.defaultPrevented || (event.type === "auxclick" ? event.button !== 1 : event.button !== undefined && event.button !== 0)) return;
    const anchor = event.target?.closest?.("a[data-analytics-event]");
    const action = actionProperties(anchor);
    if (!action) return;
    tick();
    capture(action.event, action.properties);
    void load();
  };

  const interval = doc.body.dataset.analyticsPageType === "article" ? win.setInterval(tick, 1000) : undefined;
  const controller = {
    load,
    stop() {
      stopped = true; pending = [];
      win.clearInterval(interval); win.clearTimeout(fallbackHandle);
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
      listeners.forEach((remove) => remove());
    },
  };
  win[INSTANCE] = controller;
  listen(doc, "click", onClick);
  listen(doc, "auxclick", onClick);
  listen(doc, "visibilitychange", tick);
  listen(win, "focus", tick);
  listen(win, "blur", tick);
  listen(win, "scroll", tick);
  listen(win, "resize", tick);
  listen(win, "pagehide", () => {
    tick(); suspended = true; wasForeground = false;
    // If the SDK is still loading, preserve the lifecycle event with its own
    // metadata in the same queue. A hard close before load remains best-effort.
    if (!sdk) capture("$pageleave");
    void load();
  });
  listen(win, "pageshow", (event) => { if (event.persisted) activate(); });
  activate();
  if (win.requestIdleCallback) idleHandle = win.requestIdleCallback(() => void load(), { timeout: 1500 });
  fallbackHandle = win.setTimeout(() => void load(), 1500);
  return controller;
}

if (typeof window !== "undefined" && typeof document !== "undefined") startAnalytics();
