-- Ko-fi: клики по размещениям и страницам
-- Переходы к поддержке, не оплаченные донаты. Повторные клики увеличивают clicks, но не views_with_support_click.
SELECT
  properties.placement AS placement,
  properties.content_key AS content,
  count() AS clicks,
  uniqExact(properties.view_id) AS views_with_support_click
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
  AND event = 'support_clicked'
  AND properties.provider = 'ko-fi'
  AND ((properties.page_type = 'blog_index' AND properties.placement = 'blog_tools')
    OR (properties.page_type = 'article' AND properties.placement = 'article_footer'))
  AND notEmpty(coalesce(toString(properties.view_id), ''))
GROUP BY placement, content
ORDER BY clicks DESC
