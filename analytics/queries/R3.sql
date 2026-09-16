-- RSS и ZIP — клики
-- Клики и число просмотров с кликом. Не подписки, не завершённые скачивания. Повторный клик виден в clicks, но не дублирует views_with_click.
SELECT
  event,
  properties.page_path AS path,
  coalesce(toString(properties.asset_id), 'rss') AS resource,
  count() AS clicks,
  uniqExact(properties.view_id) AS views_with_click
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event IN ('rss_clicked', 'download_clicked')
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY event, path, resource
ORDER BY clicks DESC
