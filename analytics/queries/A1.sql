-- Просмотры: 28 дней vs предыдущие 28
-- Счётчик уникальных view_id; предыдущий период той же длины. Не посетители.
SELECT
  if(timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28), 'current_28d', 'previous_28d') AS period,
  uniqExact(properties.view_id) AS pageviews
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 56)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event = '$pageview'
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY period
ORDER BY period
