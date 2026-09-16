-- Внешние профили — клики
-- LinkedIn/GitHub/DEV — интерес к профилю. Эти действия не входят в email contact intent.
SELECT
  properties.platform AS platform,
  properties.placement AS placement,
  count() AS clicks,
  uniqExact(properties.view_id) AS views_with_profile_click
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event = 'profile_clicked'
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY platform, placement
ORDER BY clicks DESC
