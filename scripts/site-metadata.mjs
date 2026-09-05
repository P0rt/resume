import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DOMAIN = "https://sergei-parfenov.com";
export const profile = JSON.parse(await readFile(new URL("../content/profile.json", import.meta.url), "utf8"));
export const localeCodes = ["en", "es", "fr", "pt", "ja", "zh", "ru"];

const englishLocale = {
  htmlLang: "en",
  hreflang: "en",
  ogLocale: "en_US",
  languageName: "English",
  seo: {
    homeTitle: "Sergei Parfenov | Co-Founder, CTO, AI/ML engineer",
    workTitle: "Work together | Sergei Parfenov",
    workDescription: "Work with Sergei Parfenov on AI products, agent evaluation, model distillation and learning systems. Experience, approach and selected work.",
  },
  ui: {
    skip: "Skip to content", home: "Home", experienceLink: "Experience & working together", blogTitle: "On the blog",
    email: "Email", privacy: "Privacy", portraitAlt: "Portrait of Sergei Parfenov", aboutTitle: "A bit about my work",
    openTitle: "In the open", helpTitle: "Where I can help", educationTitle: "Education & courses",
    experienceTitle: "The path here", earlierExperience: "Earlier experience", blog: "Blog",
  },
  markdown: {
    canonicalProfile: "Canonical profile URL", detailedExperience: "Detailed experience and collaboration",
    alsoKnownAs: "Also known as", basedIn: "Based in", background: "Background", currentWork: "Current work",
    workingTogether: "Working together", whereHelp: "Where I can help", openProjects: "Open projects",
    experience: "Experience", education: "Education & courses", writing: "Writing", publishedArticles: "published articles",
    articlesAlso: "Articles are also published on DEV.", reviewContributions: "Review contributions", by: "By",
    myRole: "My role", music: "Music", contact: "Contact and profiles",
  },
  profile,
};

const translatedLocales = Object.fromEntries(await Promise.all(localeCodes.slice(1).map(async (code) => [
  code,
  JSON.parse(await readFile(new URL(`../content/locales/${code}.json`, import.meta.url), "utf8")),
])));

function required(value, context) {
  if (value === undefined || value === null || value === "") throw new Error(`Missing localized value: ${context}`);
  return value;
}

function translatedProfile(code, locale) {
  const text = locale.profile;
  const mapByKey = (items, translations, key, transform = (item, translated) => ({ ...item, ...translated })) => items.map((item) => {
    const translated = required(translations[item[key]], `${code}.${key}.${item[key]}`);
    return transform(item, translated);
  });
  const localProfile = {
    ...profile,
    locale: locale.htmlLang,
    name: text.name || profile.name,
    role: text.role,
    description: text.description,
    summary: text.summary,
    intro: text.intro,
    homeStory: text.homeStory,
    homeCurrent: text.homeCurrent,
    blogIntro: text.blogIntro,
    location: text.location,
    about: text.about,
    writing: text.writing,
    currentRoles: mapByKey(profile.currentRoles, text.currentRoles, "organization"),
    contributions: mapByKey(profile.contributions, text.contributions, "title"),
    collaboration: text.collaboration,
    capabilities: mapByKey(profile.capabilities, text.capabilities, "name"),
    projects: mapByKey(profile.projects, text.projects, "name"),
    experience: mapByKey(profile.experience, text.experience, "company", (item, translated) => ({
      ...item,
      ...translated,
      ...(item.coverage ? { coverage: { ...item.coverage, label: translated.coverageLabel } } : {}),
      ...(item.positions ? { positions: item.positions.map((position) => ({
        ...position,
        description: required(translated.positions?.[position.company], `${code}.experience.${item.company}.${position.company}`),
      })) } : {}),
    })),
    education: mapByKey(profile.education, text.education, "institution"),
    music: { ...profile.music, description: text.music },
  };
  for (const [field, expected] of [["homeStory", profile.homeStory.length], ["about", profile.about.length]]) {
    if (localProfile[field].length !== expected) throw new Error(`Wrong localized array length: ${code}.${field}`);
  }
  localProfile.experience.forEach((item, index) => {
    const expected = profile.experience[index].highlights?.length;
    if (expected !== undefined && item.highlights?.length !== expected) throw new Error(`Wrong localized highlight count: ${code}.${item.company}`);
  });
  return localProfile;
}

export const locales = {
  en: englishLocale,
  ...Object.fromEntries(Object.entries(translatedLocales).map(([code, locale]) => [code, {
    ...locale,
    profile: translatedProfile(code, locale),
  }])),
};

export function localeHomeUrl(code = "en") {
  return code === "en" ? `${DOMAIN}/` : `${DOMAIN}/${code}/`;
}

export function localeWorkUrl(code = "en") {
  return code === "en" ? `${DOMAIN}/work-together/` : `${DOMAIN}/${code}/work-together/`;
}

export const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
export const person = {
  "@type": "Person",
  "@id": `${DOMAIN}/#person`,
  name: profile.name,
  alternateName: profile.alternateNames,
  url: `${DOMAIN}/`,
  image: profile.image,
  jobTitle: profile.role,
  description: profile.description,
  homeLocation: { "@type": "Place", name: profile.location },
  sameAs: profile.sameAs,
  alumniOf: profile.education.filter((item) => item.kind === "degree").map((item) => ({ "@type": "CollegeOrUniversity", name: item.institution })),
  worksFor: profile.currentRoles.map(({ organization }) => ({ "@type": "Organization", name: organization })),
  knowsAbout: ["Artificial intelligence", "Machine learning", "AI agents", "Model evaluation", "Product engineering", "Educational technology"],
};
const website = { "@type": "WebSite", "@id": `${DOMAIN}/#website`, url: `${DOMAIN}/`, name: profile.name, inLanguage: localeCodes.map((code) => locales[code].htmlLang), publisher: { "@id": person["@id"] } };

export function homeSchema(code = "en") {
  const locale = locales[code];
  const localizedPerson = { ...person, name: locale.profile.name, jobTitle: locale.profile.role, description: locale.profile.description,
    homeLocation: { "@type": "Place", name: locale.profile.location } };
  const url = localeHomeUrl(code);
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    website,
    { "@type": "ProfilePage", "@id": `${url}#profile`, url, name: profile.name, description: locale.profile.description, inLanguage: locale.htmlLang, isPartOf: { "@id": website["@id"] }, mainEntity: localizedPerson },
  ] });
}

export function workSchema(code = "en") {
  const locale = locales[code];
  const url = localeWorkUrl(code);
  const localizedPerson = { ...person, name: locale.profile.name, jobTitle: locale.profile.role, description: locale.profile.description,
    homeLocation: { "@type": "Place", name: locale.profile.location } };
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    website, localizedPerson,
    { "@type": "AboutPage", "@id": `${url}#page`, url,
      name: locale.seo.workTitle, inLanguage: locale.htmlLang, description: locale.profile.collaboration.description,
      isPartOf: { "@id": website["@id"] }, mainEntity: { "@id": person["@id"] } },
  ] });
}

export function blogSchema(articles) {
  const contributions = profile.contributions.map((item) => ({
    "@type": "CreativeWork", "@id": item.url, url: item.url, name: item.title,
    description: `${item.summary} ${profile.name}: ${item.role}.`,
    datePublished: item.datePublished, inLanguage: "en",
    author: { "@type": "Person", name: item.author },
    publisher: { "@type": "Organization", name: item.publisher },
    contributor: { "@id": person["@id"] },
  }));
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    website, person, ...contributions,
    { "@type": "Blog", "@id": `${DOMAIN}/blog.html#blog`, url: `${DOMAIN}/blog.html`, name: `Writing by ${profile.name}`, inLanguage: "en", author: { "@id": person["@id"] }, isPartOf: { "@id": website["@id"] },
      mentions: contributions.map((item) => ({ "@id": item["@id"] })),
      blogPost: articles.map((article) => ({ "@type": "BlogPosting", "@id": `${article.canonicalUrl}#article`, url: article.canonicalUrl, headline: article.title, datePublished: article.date, author: { "@id": person["@id"] } })) },
  ] });
}

export function articleSchema(article) {
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    { "@type": "BlogPosting", "@id": `${article.canonicalUrl}#article`, url: article.canonicalUrl,
      headline: article.title, description: article.description, datePublished: article.date, dateModified: article.updated,
      mainEntityOfPage: { "@type": "WebPage", "@id": article.canonicalUrl },
      isPartOf: { "@type": "Blog", "@id": `${DOMAIN}/blog.html#blog`, url: `${DOMAIN}/blog.html`, name: `Writing by ${profile.name}` },
      inLanguage: article.language || "en", keywords: article.tags.join(", "),
      ...(article.coverImage ? { image: article.coverImage } : {}),
      ...(article.sourceUrl ? { sameAs: article.sourceUrl } : {}),
      author: person, publisher: { "@id": person["@id"] } },
    { "@type": "BreadcrumbList", "@id": `${article.canonicalUrl}#breadcrumbs`, itemListElement: [
      { "@type": "ListItem", position: 1, name: profile.name, item: `${DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${DOMAIN}/blog.html` },
      { "@type": "ListItem", position: 3, name: article.title, item: article.canonicalUrl },
    ] },
  ] });
}

export function profileMarkdown(articleCount, code = "en") {
  const locale = locales[code];
  const localProfile = locale.profile;
  const labels = locale.markdown;
  const homeUrl = localeHomeUrl(code);
  const workUrl = localeWorkUrl(code);
  const currentWork = localProfile.currentRoles.map((job) => `### ${job.organization}\n\n${job.role}\n\n${job.description}\n\n${job.url}`).join("\n\n");
  const experience = localProfile.experience.map((job) => `### ${job.company}\n\n${job.role} | ${job.period}\n\n${job.description || job.positions.map((position) => `- ${position.company}: ${position.description}`).join("\n")}${job.highlights ? `\n\n${job.highlights.join("\n\n")}` : ""}${job.url ? `\n\n${job.url}` : ""}${job.coverage ? `\n\n[${job.coverage.label}](${job.coverage.url})` : ""}`).join("\n\n");
  return [
    `# ${localProfile.name}`, localProfile.role, localProfile.description,
    `${labels.canonicalProfile}: ${homeUrl}\n${labels.detailedExperience}: ${workUrl}\n${labels.alsoKnownAs}: ${localProfile.alternateNames.join(", ")}\n${labels.basedIn}: ${localProfile.location}`,
    `## ${localProfile.summary}`, localProfile.intro, localProfile.homeStory.join("\n\n"), localProfile.homeCurrent,
    `## ${labels.background}`, localProfile.about.join("\n\n"),
    `## ${labels.currentWork}`, currentWork,
    `## ${labels.workingTogether}`, localProfile.collaboration.description, localProfile.collaboration.approach, localProfile.collaboration.invitation,
    `## ${labels.whereHelp}`, localProfile.capabilities.map((item) => `### ${item.name}\n\n${item.description}`).join("\n\n"),
    `## ${labels.openProjects}`, localProfile.projects.map((project) => `### ${project.name}\n\n${project.description}\n\n${project.url}`).join("\n\n"),
    `## ${labels.experience}`, experience,
    `## ${labels.education}`, localProfile.education.map((item) => `### ${item.institution}\n\n${item.url ? `[${item.program}](${item.url})` : item.program}\n\n${item.qualification} | ${item.period}`).join("\n\n"),
    `## ${labels.writing}`, localProfile.writing,
    `${articleCount} ${labels.publishedArticles}: ${DOMAIN}/blog.html\n${labels.articlesAlso}`,
    `## ${labels.reviewContributions}`, localProfile.contributions.map((item) => `### [${item.title}](${item.url})\n\n${code === "en" ? `${labels.by} ${item.author}` : `${labels.by}: ${item.author}`} | ${item.publisher} | ${item.datePublished}\n${labels.myRole}: ${item.role}\n\n${item.summary}\n\n${item.contribution}`).join("\n\n"),
    `## ${labels.music}`, `${localProfile.music.description}\n${localProfile.music.url}`,
    `## ${labels.contact}`, `Email: ${localProfile.email}\n${localProfile.sameAs.join("\n")}`,
  ].join("\n\n") + "\n";
}

export function articleMetadata(article) {
  return { id: article.slug, title: article.title, description: article.description, url: article.canonicalUrl,
    markdownUrl: `${article.canonicalUrl}index.md`, author: { name: profile.name, url: `${DOMAIN}/` },
    datePublished: article.date, dateModified: article.updated, language: article.language || "en", tags: article.tags,
    ...(article.sourceUrl ? { sourceUrl: article.sourceUrl } : {}) };
}

export function articleMarkdown(article) {
  return `# ${article.title}\n\nAuthor: ${profile.name}\nCanonical URL: ${article.canonicalUrl}\nPublished: ${article.date}\nUpdated: ${article.updated}\n${article.sourceUrl ? `Also published on DEV: ${article.sourceUrl}\n` : ""}\n${article.content.trim()}\n`;
}

export async function writeAgentFiles(articles, outputDirectory) {
  const catalog = articles.map(articleMetadata);
  const localized = Object.fromEntries(localeCodes.map((code) => {
    const localizedBio = {
      ...locales[code].profile,
      language: locales[code].htmlLang,
      url: localeHomeUrl(code),
      workUrl: localeWorkUrl(code),
      articleCount: articles.length,
    };
    return [code, { profile: localizedBio, profileMarkdown: profileMarkdown(articles.length, code) }];
  }));
  const { profile: bio, profileMarkdown: markdown } = localized.en;
  const localizedResources = localeCodes.slice(1).flatMap((code) => [`${DOMAIN}/${code}/profile.json`, `${DOMAIN}/${code}/index.md`]);
  const manifest = {
    name: "Sergei Parfenov: public profile and writing",
    description: "Public read-only access. This JSON document describes this site's MCP service; it is not an MCP discovery standard.",
    endpoint: `${DOMAIN}/mcp`, transport: "streamable-http", authentication: "none", readOnly: true,
    tools: ["get_profile", "search", "fetch"],
    supportedLocales: localeCodes,
    resources: [`${DOMAIN}/profile.json`, `${DOMAIN}/index.md`, ...localizedResources, `${DOMAIN}/articles.json`, ...catalog.map((article) => article.markdownUrl)],
    clientConfiguration: { mcpServers: { "sergei-parfenov": { url: `${DOMAIN}/mcp` } } },
    notes: "Use an MCP client with Streamable HTTP support. GET on the endpoint returns 405 because this server does not provide an SSE subscription. All data is also available as static JSON and Markdown.",
  };
  const directory = `# ${profile.name}\n\n> ${profile.description}\n\nThis is the personal site and article archive of ${profile.name}. All text is public and available without JavaScript or authentication. Article metadata includes the author, publication date, canonical URL, and DEV counterpart when present.\n\n## Profile\n\n- [Profile](${DOMAIN}/index.md): Biography, current roles, full career history, interests, and contact links.\n- [Profile JSON](${DOMAIN}/profile.json): Structured public profile.\n${localeCodes.slice(1).map((code) => `- [${locales[code].languageName}](${DOMAIN}/${code}/index.md): Localized profile and work history. [JSON](${DOMAIN}/${code}/profile.json).`).join("\n")}\n\n## Articles\n\n- [Article index](${DOMAIN}/articles.json): Every published article with its canonical URL and Markdown URL.\n- [Blog](${DOMAIN}/blog.html): Human-readable archive.\n- [RSS](${DOMAIN}/rss.xml): Recent publications.\n${catalog.map((article) => `- [${article.title}](${article.markdownUrl}): ${article.description.replace(/\s+/g, " ")}`).join("\n")}\n\n## MCP\n\n- [Connection details](${DOMAIN}/mcp.json): Public read-only Streamable HTTP endpoint at ${DOMAIN}/mcp. Tools: get_profile, search, fetch. Pass locale as en, es, fr, pt, ja, zh or ru. No API key is needed.\n\n## Source and citation\n\nUse each document's canonical HTML URL for a link or citation. The Markdown and JSON URLs are alternate representations, not separate publications. Drafts and the retired resume PDF are not exposed. This file is a convenience index for agents, not a Google ranking signal.\n`;
  await Promise.all([
    writeFile(path.join(outputDirectory, "profile.json"), JSON.stringify(bio, null, 2) + "\n"),
    writeFile(path.join(outputDirectory, "articles.json"), JSON.stringify({ author: bio.name, home: bio.url, articles: catalog }, null, 2) + "\n"),
    writeFile(path.join(outputDirectory, "index.md"), markdown),
    writeFile(path.join(outputDirectory, "llms.txt"), directory),
    writeFile(path.join(outputDirectory, "mcp.json"), JSON.stringify(manifest, null, 2) + "\n"),
    ...localeCodes.slice(1).flatMap((code) => [
      writeFile(path.join(outputDirectory, code, "profile.json"), JSON.stringify(localized[code].profile, null, 2) + "\n"),
      writeFile(path.join(outputDirectory, code, "index.md"), localized[code].profileMarkdown),
    ]),
    ...articles.map((article) => writeFile(path.join(outputDirectory, "blog", article.slug, "index.md"), articleMarkdown(article))),
  ]);
  // Only the published snapshot is bundled into the function. Never ship source drafts.
  const generated = path.join(path.dirname(outputDirectory), ".generated");
  await mkdir(generated, { recursive: true });
  await writeFile(path.join(generated, "mcp-data.json"), JSON.stringify({ profile: bio, profileMarkdown: markdown, locales: localized,
    articles: articles.map((article) => ({ ...articleMetadata(article), text: articleMarkdown(article) })) }));
}
