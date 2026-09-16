-- DO NOT RUN AS A RELEASE REPORT: time-boundary assumptions need redesign.
-- Daily cookieless hashing breaks sessions at day boundaries; a fixed 24h cap is not guaranteed.
-- Статья → work → email — одна сессия
-- Порядок событий обязателен, промежуточные события допустимы. Никакая пользовательская междневная воронка не заменяет этот отчёт.
SELECT
  countIf(article_work_email_stage >= 1) AS article_sessions,
  countIf(article_work_email_stage >= 2) AS reached_work_after_article,
  countIf(article_work_email_stage >= 3) AS reached_email_after_work,
  round(100.0 * countIf(article_work_email_stage >= 3) / nullIf(countIf(article_work_email_stage >= 1), 0), 2) AS article_to_email_percent
FROM (
  SELECT
    properties.$session_id AS session_id,
    min(timestamp) AS session_start,
    max(timestamp) AS last_event,
    argMinIf(properties.page_type, timestamp, event = '$pageview') AS entry_type,
    argMinIf(properties.article_slug, timestamp, event = '$pageview') AS entry_article,
    argMinIf(coalesce(nullIf(toString(properties.utm_source), ''), nullIf(toString(properties.$referring_domain), ''), 'direct_or_unknown'), timestamp, event = '$pageview') AS entry_source,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'contact_clicked' AND properties.channel = 'email') AS contacts,
    countIf(event = '$pageview' AND properties.page_type = 'work_together') AS work_views,
    windowFunnel(86400)(timestamp,
      event = '$pageview' AND properties.page_type = 'article',
      event = '$pageview' AND properties.page_type = 'work_together',
      event = 'contact_clicked' AND properties.channel = 'email'
    ) AS article_work_email_stage
  FROM events
  WHERE timestamp >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 29)
    AND timestamp < now()
    AND properties.environment = 'production'
  AND properties.$host IN ('sergei-parfenov.com', 'www.sergei-parfenov.com')
  AND toString(properties.schema_version) = '1'
  AND properties.analytics_mode = 'cookieless'
    AND notEmpty(coalesce(toString(properties.$session_id), ''))
  GROUP BY session_id
  HAVING pageviews > 0
    AND session_start >= subtractDays(toStartOfDay(toTimeZone(now(), 'Europe/Madrid')), 28)
    AND session_start < toStartOfDay(toTimeZone(now(), 'Europe/Madrid'))
    AND last_event < subtractMinutes(now(), 30)
)
