-- Источники просмотров — referrer и UTM
-- Источник конкретного просмотра. Это ещё не отчёт по источнику входа в сессию; внутренний referrer может быть виден и не считается внешним привлечением.
SELECT
  coalesce(nullIf(toString(properties.utm_source), ''), nullIf(toString(properties.$referring_domain), ''), 'direct_or_unknown') AS source,
  coalesce(nullIf(toString(properties.utm_medium), ''), 'none') AS medium,
  coalesce(nullIf(toString(properties.utm_campaign), ''), 'none') AS campaign,
  uniqExact(properties.view_id) AS pageviews
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event = '$pageview'
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY source, medium, campaign
ORDER BY pageviews DESC
LIMIT 100
