import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DOMAIN = "https://sergei-parfenov.com";
export const profile = JSON.parse(await readFile(new URL("../content/profile.json", import.meta.url), "utf8"));
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
  sameAs: profile.sameAs,
  worksFor: profile.currentRoles.map(({ organization }) => ({ "@type": "Organization", name: organization })),
  knowsAbout: ["Artificial intelligence", "Machine learning", "AI agents", "Model evaluation", "Product engineering", "Educational technology"],
};
const website = { "@type": "WebSite", "@id": `${DOMAIN}/#website`, url: `${DOMAIN}/`, name: profile.name, inLanguage: "en", publisher: { "@id": person["@id"] } };

export function homeSchema() {
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    website,
    { "@type": "ProfilePage", "@id": `${DOMAIN}/#profile`, url: `${DOMAIN}/`, name: profile.name, description: profile.description, inLanguage: "en", isPartOf: { "@id": website["@id"] }, mainEntity: person },
  ] });
}

export function blogSchema(articles) {
  return jsonLd({ "@context": "https://schema.org", "@graph": [
    website, person,
    { "@type": "Blog", "@id": `${DOMAIN}/blog.html#blog`, url: `${DOMAIN}/blog.html`, name: `Writing by ${profile.name}`, inLanguage: "en", author: { "@id": person["@id"] }, isPartOf: { "@id": website["@id"] },
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

export function profileMarkdown(articleCount) {
  return `# ${profile.name}\n\n${profile.role}\n\n${profile.description}\n\nCanonical URL: ${DOMAIN}/\nAlso known as: ${profile.alternateNames.join(", ")}\n\n## Current work\n\n${profile.currentRoles.map((job) => `- ${job.role}, ${job.organization}`).join("\n")}\n\n## Focus\n\n${profile.capabilities.map((item) => `- ${item.name}: ${item.description}`).join("\n")}\n\n## Experience\n\n${profile.experience.map((job) => `### ${job.company}\n\n${job.role} | ${job.period}\n\n${job.description || job.positions.map((position) => `- ${position.company}: ${position.description}`).join("\n")}${job.url ? `\n\n${job.url}` : ""}`).join("\n\n")}\n\n## Writing\n\n${articleCount} published articles: ${DOMAIN}/blog.html\n${profile.audience}. Articles are also published on DEV.\n\n## Music\n\n${profile.music.description}\n${profile.music.url}\n\n## Contact and profiles\n\nEmail: ${profile.email}\n${profile.sameAs.join("\n")}\n`;
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
  const bio = { ...profile, url: `${DOMAIN}/`, articleCount: articles.length };
  const markdown = profileMarkdown(articles.length);
  const manifest = {
    name: "Sergei Parfenov: public profile and writing",
    description: "Public read-only access. This JSON document describes this site's MCP service; it is not an MCP discovery standard.",
    endpoint: `${DOMAIN}/mcp`, transport: "streamable-http", authentication: "none", readOnly: true,
    tools: ["get_profile", "search", "fetch"],
    resources: [`${DOMAIN}/profile.json`, `${DOMAIN}/articles.json`, ...catalog.map((article) => article.markdownUrl)],
    clientConfiguration: { mcpServers: { "sergei-parfenov": { url: `${DOMAIN}/mcp` } } },
    notes: "Use an MCP client with Streamable HTTP support. GET on the endpoint returns 405 because this server does not provide an SSE subscription. All data is also available as static JSON and Markdown.",
  };
  const directory = `# ${profile.name}\n\n> ${profile.description}\n\nThis is the personal site and article archive of ${profile.name}. All text is public and available without JavaScript or authentication. Article metadata includes the author, publication date, canonical URL, and DEV counterpart when present.\n\n## Profile\n\n- [Profile](${DOMAIN}/index.md): Biography, current roles, full career history, interests, and contact links.\n- [Profile JSON](${DOMAIN}/profile.json): Structured public profile.\n\n## Articles\n\n- [Article index](${DOMAIN}/articles.json): Every published article with its canonical URL and Markdown URL.\n- [Blog](${DOMAIN}/blog.html): Human-readable archive.\n- [RSS](${DOMAIN}/rss.xml): Recent publications.\n${catalog.map((article) => `- [${article.title}](${article.markdownUrl}): ${article.description.replace(/\s+/g, " ")}`).join("\n")}\n\n## MCP\n\n- [Connection details](${DOMAIN}/mcp.json): Public read-only Streamable HTTP endpoint at ${DOMAIN}/mcp. Tools: get_profile, search, fetch. No API key is needed.\n\n## Source and citation\n\nUse each document's canonical HTML URL for a link or citation. The Markdown and JSON URLs are alternate representations, not separate publications. Drafts and the retired resume PDF are not exposed. This file is a convenience index for agents, not a Google ranking signal.\n`;
  await Promise.all([
    writeFile(path.join(outputDirectory, "profile.json"), JSON.stringify(bio, null, 2) + "\n"),
    writeFile(path.join(outputDirectory, "articles.json"), JSON.stringify({ author: bio.name, home: bio.url, articles: catalog }, null, 2) + "\n"),
    writeFile(path.join(outputDirectory, "index.md"), markdown),
    writeFile(path.join(outputDirectory, "llms.txt"), directory),
    writeFile(path.join(outputDirectory, "mcp.json"), JSON.stringify(manifest, null, 2) + "\n"),
    ...articles.map((article) => writeFile(path.join(outputDirectory, "blog", article.slug, "index.md"), articleMarkdown(article))),
  ]);
  // Only the published snapshot is bundled into the function. Never ship source drafts.
  const generated = path.join(path.dirname(outputDirectory), ".generated");
  await mkdir(generated, { recursive: true });
  await writeFile(path.join(generated, "mcp-data.json"), JSON.stringify({ profile: bio, profileMarkdown: markdown,
    articles: articles.map((article) => ({ ...articleMetadata(article), text: articleMarkdown(article) })) }));
}
