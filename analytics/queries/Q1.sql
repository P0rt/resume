-- Объём событий и версии схемы — 7 дней
-- Диагностический объём; неожиданные события и версии видны, а не скрыты фильтром схемы.
SELECT
  event,
  coalesce(toString(properties.schema_version), 'missing') AS schema_version,
  coalesce(toString(properties.analytics_mode), 'missing') AS analytics_mode,
  count() AS events
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 7)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
GROUP BY event, schema_version, analytics_mode
ORDER BY events DESC
