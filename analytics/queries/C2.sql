-- Просмотры страниц с email и клики — вспомогательный показатель
-- Доля просмотров страниц home/work_together с email-кликом. Это дополнительная метрика уровня просмотра; она не заменяет утверждённую конверсию сессий.
SELECT
  page_type,
  count() AS pageviews_with_email_available,
  countIf(contact_events > 0) AS views_with_email_click,
  round(100.0 * countIf(contact_events > 0) / nullIf(count(), 0), 2) AS view_click_percent
FROM (
  SELECT
    properties.view_id AS view_id,
    anyIf(properties.page_type, event = '$pageview') AS page_type,
    minIf(timestamp, event = '$pageview') AS viewed_at,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'contact_clicked') AS contact_events
  FROM events
  WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
    AND timestamp < now()
    AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
    AND properties.page_type IN ('home', 'work_together')
    AND event IN ('$pageview', 'contact_clicked')
    AND notEmpty(coalesce(toString(properties.view_id), ''))
  GROUP BY view_id
  HAVING pageviews > 0 AND viewed_at < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
)
GROUP BY page_type
ORDER BY pageviews_with_email_available DESC
