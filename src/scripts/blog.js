const feed = document.querySelector("[data-dev-feed]");
const feedStatus = document.querySelector("[data-feed-status]");

function createArticleCard(article) {
  const card = document.createElement("article");
  const link = document.createElement("a");
  const meta = document.createElement("div");
  const topic = document.createElement("span");
  const duration = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const source = document.createElement("span");
  const arrow = document.createElement("span");

  card.className = "feed-card is-visible";
  link.href = article.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  meta.className = "article-meta";
  topic.textContent = article.tag_list?.[0] || "AI engineering";
  duration.textContent = `${article.reading_time_minutes} min read`;
  meta.append(topic, duration);

  title.textContent = article.title;
  description.textContent = article.description || "A field note on building and operating AI systems.";

  source.className = "article-source";
  source.textContent = "Read on DEV ";
  arrow.textContent = "↗";
  arrow.setAttribute("aria-hidden", "true");
  source.append(arrow);

  link.append(meta, title, description, source);
  card.append(link);
  return card;
}

async function loadDevFeed() {
  if (!feed) return;
  feed.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("https://dev.to/api/articles?username=p0rt&per_page=8");
    if (!response.ok) throw new Error("DEV feed request failed");

    const articles = await response.json();
    if (!Array.isArray(articles) || articles.length === 0) throw new Error("DEV feed is empty");

    const fragment = document.createDocumentFragment();
    articles.forEach((article) => fragment.append(createArticleCard(article)));
    feed.replaceChildren(fragment);
    if (feedStatus) feedStatus.textContent = `Showing ${articles.length} latest essays from DEV`;
  } catch (error) {
    if (feedStatus) feedStatus.textContent = "Showing selected essays";
  } finally {
    feed.setAttribute("aria-busy", "false");
  }
}

loadDevFeed();
