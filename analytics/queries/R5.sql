-- Ko-fi: доля просмотров с кликом
-- Знаменатель содержит только pageview с support_available=true. Наличие ссылки на странице не означает её попадание в видимую область.
-- Когорта по времени pageview; последующий клик с тем же view_id может завершить просмотр предыдущего дня. Это не платёжная конверсия.
SELECT
  page_type,
  content,
  count() AS pageviews_with_support_available,
  countIf(support_events > 0) AS views_with_support_click,
  round(100.0 * countIf(support_events > 0) / nullIf(count(), 0), 2) AS view_click_percent
FROM (
  SELECT
    properties.view_id AS view_id,
    anyIf(properties.page_type, event = '$pageview') AS page_type,
    anyIf(properties.content_key, event = '$pageview') AS content,
    minIf(timestamp, event = '$pageview') AS viewed_at,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'support_clicked') AS support_events
  FROM events
  WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
    AND timestamp < now()
    AND properties.environment = 'production'
    AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
    AND toString(properties.schema_version) = '1'
    AND properties.analytics_mode = 'cookieless'
    AND properties.page_type IN ('blog_index', 'article')
    AND ((event = '$pageview' AND properties.support_available = true)
      OR (event = 'support_clicked' AND properties.provider = 'ko-fi'
        AND ((properties.page_type = 'blog_index' AND properties.placement IN ('blog_tools', 'blog_intro'))
          OR (properties.page_type = 'article' AND properties.placement = 'article_footer'))))
    AND notEmpty(coalesce(toString(properties.view_id), ''))
  GROUP BY view_id
  HAVING pageviews > 0 AND viewed_at < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
)
GROUP BY page_type, content
ORDER BY pageviews_with_support_available DESC
