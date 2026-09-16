-- Email — клики по размещениям
-- Email only. Не лиды и не отправленные письма. Размещения home_footer / work_primary.
SELECT
  properties.placement AS placement,
  count() AS clicks,
  uniqExact(properties.view_id) AS views_with_email_click
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event = 'contact_clicked'
  AND properties.channel = 'email'
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY placement
ORDER BY clicks DESC
