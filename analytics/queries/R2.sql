-- Вовлечённость по неделям — просмотры статей
-- Неполные крайние недели: первая/последняя корзины могут содержать менее семи дней. Числитель и знаменатель показаны рядом.
SELECT
  toMonday(toTimeZone(viewed_at, 'Europe/Madrid')) AS week,
  count() AS viewed,
  countIf(engaged_events > 0) AS engaged,
  round(100.0 * countIf(engaged_events > 0) / nullIf(count(), 0), 2) AS engaged_percent
FROM (
  SELECT
    properties.view_id AS view_id,
    anyIf(properties.article_slug, event = '$pageview') AS slug,
    minIf(timestamp, event = '$pageview') AS viewed_at,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'article_engaged') AS engaged_events
  FROM events
  WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
    AND timestamp < now()
    AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
    AND properties.page_type = 'article'
    AND event IN ('$pageview', 'article_engaged')
    AND notEmpty(coalesce(toString(properties.view_id), ''))
  GROUP BY view_id
  HAVING pageviews > 0 AND viewed_at < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
)
GROUP BY week
ORDER BY week
