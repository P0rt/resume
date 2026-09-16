-- Дубли и pageleave coverage — 7 дней
-- Pageleave доставляется best effort; 100% не требуется. Дубликаты сигнализируют о повторной инициализации обработчиков.
SELECT
  count() AS total_views,
  countIf(pageviews > 1) AS views_with_duplicate_pageview,
  countIf(engaged_events > 1) AS views_with_duplicate_engagement,
  countIf(pageleaves > 0) AS views_with_pageleave,
  round(100.0 * countIf(pageleaves > 0) / nullIf(count(), 0), 2) AS pageleave_coverage_percent
FROM (
  SELECT
    properties.view_id AS view_id,
    minIf(timestamp, event = '$pageview') AS viewed_at,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'article_engaged') AS engaged_events,
    countIf(event = '$pageleave') AS pageleaves
  FROM events
  WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 7)
    AND timestamp < now()
    AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
    AND event IN ('$pageview', '$pageleave', 'article_engaged')
    AND notEmpty(coalesce(toString(properties.view_id), ''))
  GROUP BY view_id
  HAVING pageviews > 0 AND viewed_at < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
)
