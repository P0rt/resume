-- Обязательные поля и session ID — 7 дней
-- Сессионные отчёты не включаются только по заполненности ID: отдельно нужен реальный многостраничный сценарий.
SELECT
  event,
  count() AS events,
  countIf(empty(coalesce(toString(properties.schema_version), ''))
    OR empty(coalesce(toString(properties.page_type), ''))
    OR empty(coalesce(toString(properties.page_path), ''))
    OR empty(coalesce(toString(properties.content_key), ''))
    OR empty(coalesce(toString(properties.page_locale), ''))
    OR empty(coalesce(toString(properties.view_id), ''))
    OR empty(coalesce(toString(properties.environment), ''))
    OR empty(coalesce(toString(properties.analytics_mode), ''))) AS missing_required,
  countIf(empty(coalesce(toString(properties.$session_id), ''))) AS missing_session_id,
  countIf(properties.page_type = 'article' AND empty(coalesce(toString(properties.article_slug), ''))) AS articles_without_slug
FROM events
WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 7)
  AND timestamp < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
  AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
GROUP BY event
ORDER BY missing_required DESC, events DESC
