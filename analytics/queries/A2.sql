-- Страницы и языки — просмотры
-- Просмотры реальных страниц, сгруппированные по содержанию и языку.
SELECT
  properties.content_key AS content,
  properties.page_locale AS locale,
  properties.page_path AS path,
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
GROUP BY content, locale, path
ORDER BY pageviews DESC
LIMIT 100
