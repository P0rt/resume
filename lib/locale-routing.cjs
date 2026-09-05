const supportedLocales = ["en", "es", "fr", "pt", "ja", "zh", "ru"];

const aliases = new Map([
  ["en", "en"],
  ["es", "es"],
  ["fr", "fr"],
  ["pt", "pt"],
  ["ja", "ja"],
  ["jp", "ja"],
  ["zh", "zh"],
  ["ru", "ru"],
]);

function normalizeLocale(value) {
  if (typeof value !== "string") return "en";
  const language = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return aliases.get(language) || "en";
}

function matchedLocale(value) {
  if (typeof value !== "string") return undefined;
  return aliases.get(value.trim().toLowerCase().split(/[-_]/, 1)[0]);
}

function preferredLocale(header = "") {
  if (Array.isArray(header)) header = header.join(",");
  if (typeof header !== "string") return "en";
  const preferences = header.split(",").map((part, index) => {
    const [tag, ...parameters] = part.trim().split(";");
    const quality = parameters.reduce((current, parameter) => {
      const match = parameter.trim().match(/^q=(0(?:\.\d+)?|1(?:\.0+)?)$/i);
      return match ? Number(match[1]) : current;
    }, 1);
    return { locale: matchedLocale(tag), tag: tag.toLowerCase(), quality, index };
  }).filter(({ tag, quality }) => tag && tag !== "*" && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  const match = preferences.find(({ locale }) => locale && supportedLocales.includes(locale));
  return match?.locale || "en";
}

function localizedPath(pathname, locale) {
  if (locale === "en") return pathname;
  if (pathname === "/") return `/${locale}/`;
  if (pathname === "/work-together/") return `/${locale}/work-together/`;
  return pathname;
}

function localeRedirect(request) {
  const url = new URL(request.url);
  const locale = preferredLocale(request.headers.get("accept-language") || "");
  const pathname = localizedPath(url.pathname, locale);
  if (pathname === url.pathname) return undefined;

  url.pathname = pathname;
  return new Response(null, {
    status: 307,
    headers: {
      Location: url.toString(),
      Vary: "Accept-Language",
      "Cache-Control": "private, no-store",
    },
  });
}

// Shared by Vercel’s CommonJS middleware bundle and the ESM MCP server.
exports.supportedLocales = supportedLocales;
exports.normalizeLocale = normalizeLocale;
exports.preferredLocale = preferredLocale;
exports.localizedPath = localizedPath;
exports.localeRedirect = localeRedirect;
