---
title: The Bug That Crashes Your Import Is the Lucky One
slug: the-bug-that-crashes-your-import-is-the-lucky-one-25of
description: >-
  Fixing Slack import robustness in Zulip: one malformed timestamp aborted
  entire migrations, and the NaN case corrupted them silently.
published: true
date: '2026-07-31T12:43:45Z'
updated: '2026-07-31T12:43:45Z'
readingTime: 6
tags:
  - devchallenge
  - bugsmash
  - python
  - opensource
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fdmu4ss4hsodpnh9j88z1.png
source: dev
sourceUrl: 'https://dev.to/p0rt/the-bug-that-crashes-your-import-is-the-lucky-one-25of'
devId: 4225243
canonicalUrl: >-
  https://sergei-parfenov.com/blog/the-bug-that-crashes-your-import-is-the-lucky-one-25of/
---

*This is a submission for [DEV's Summer Bug Smash: Clear the Lineup](https://dev.to/bugsmash) powered by [Sentry](https://sentry.io/).*

You are migrating a 50,000-message Slack workspace to Zulip. Somewhere around message 31,000 the import dies with `KeyError: 'ts'`. Annoying, but here is the uncomfortable part: **that is the lucky outcome.** The unlucky one is `"ts": "NaN"`, where nothing dies, nothing warns, and your company's message history quietly comes out in the wrong order.

> **TL;DR:** Zulip's Slack importer used `float(message["ts"])` unguarded, both as a sort key and as `date_sent`. One message with a missing or malformed `ts` aborted the entire import; a non-finite value like `"NaN"` did not even raise, it silently broke the sort. My fix ([zulip/zulip#39813](https://github.com/zulip/zulip/pull/39813)) skips such messages with a warning and requires `ts` to parse to a *finite* float via `math.isfinite`. The regression test fails with `KeyError: 'ts'` on the old code.

## Project Overview

[Zulip](https://github.com/zulip/zulip) is an open-source team chat server (Django/Python, ~25k stars) with an unusually strict engineering culture: near-total backend test coverage, strict mypy, and a commit discipline of "each commit is a minimal coherent idea".

The code I touched lives in `zerver/data_import/`: the subsystem that converts exports from Slack, Microsoft Teams, and Mattermost into Zulip's format. This subsystem has one property that should shape every line in it: **the input is another tool's output.** Import is a long batch process over data of arbitrary quality, and the admin running the migration has no way to "fix" what Slack's export tool produced. A pipeline that dies on record 31,207 of 50,000 is strictly worse than one that skips record 31,207 with a warning.

## Bug Fix or Performance Improvement

`get_messages_iterator()` in `zerver/data_import/slack.py` streams every message of the export, sorting each day's messages by timestamp:

```python
yield from sorted(messages_for_one_day, key=get_timestamp_from_message)
```

where the sort key was simply:

```python
def get_timestamp_from_message(message: ZerverFieldsT) -> float:
    return float(message["ts"])
```

That one line has **three distinct failure modes**, all reproduced during validation:

**1. `ts` is missing.** `KeyError: 'ts'` straight out of `sorted(...)`. The whole import aborts because of one message:

```python
File "zerver/data_import/slack.py", line 911, in get_messages_iterator
  yield from sorted(messages_for_one_day, key=get_timestamp_from_message)
File "zerver/data_import/slack.py", line 1461, in get_timestamp_from_message
  return float(message["ts"])
KeyError: 'ts'
```

**2. `ts` is garbage.** `"not-a-number"` raises `ValueError`. Same total abort.

**3. `ts` is `"NaN"`.** The nasty one. `float("NaN")` is a perfectly valid parse, so nothing raises. But NaN is incomparable (`NaN < x` and `x < NaN` are both False), which violates the total ordering Timsort assumes, so `sorted()` silently returns an inconsistent order:

```python
sorted(["1434139102.000002", "NaN", "1434139101.000001"], key=float)
# => ['1434139102.000002', 'NaN', '1434139101.000001']   # not sorted, no error
```

No exception, no warning. Just a migrated archive with scrambled chronology. Crashing is the lucky case; this is the case that costs you a re-migration three weeks later when someone notices the history reads wrong.

One honesty note: I did not discover this failure class from zero. The Zulip maintainers' own audit issue ([#39650](https://github.com/zulip/zulip/issues/39650)) flags the unguarded timestamp sort key as one of the two highest-impact robustness items, and it was unclaimed when I picked it up. What I brought is the implementation, the non-finite analysis, and the test that pins the behavior.

## Code

PR: **[zulip/zulip#39813](https://github.com/zulip/zulip/pull/39813)** (branch `P0rt:slack-ts-guard`, single commit, +54/-0 across the module and its test file).

The fix is a predicate plus a guard, following the skip-with-warning pattern that already exists two lines above for other unimportable messages:

```python
def message_has_valid_timestamp(message: ZerverFieldsT) -> bool:
    """Whether `ts` is present and parses to a finite float.

    `get_timestamp_from_message` is used both as a sort key and for
    `date_sent`, so a missing or malformed `ts` on a single message
    would otherwise abort the entire import - and a non-finite value
    like "NaN" would not even raise, instead silently producing an
    inconsistent sort order.
    """
    try:
        return math.isfinite(float(message["ts"]))
    except (KeyError, TypeError, ValueError):
        return False
```

```python
if not message_has_valid_timestamp(message):
    logging.warning(
        "Skipping Slack message with invalid ts %r in %s",
        message.get("ts"), message_dir,
    )
    continue
```

The detail that matters: `math.isfinite`, not a bare try/except around `float()`. A naive "does it parse" check would have fixed the two loud failure modes and waved the silent one straight through.

## My Improvements

**The test had to fail first.** I wrote `test_get_messages_iterator_skips_invalid_timestamps`: a temp directory with one day of Slack export containing five messages, two valid (deliberately in reverse chronological order), one with no `ts`, one with `"not-a-number"`, one with `"NaN"`. Then I rolled the source file back to `upstream/main`, kept the test, and ran it: `KeyError: 'ts'`, exactly the predicted crash. Restored the fix: the test asserts that exactly the two valid messages survive, in correct order, with exactly three warnings logged. A regression test that never failed against the old code is a test fitted to the fix, not a test of the fix.

**Full-suite validation in a provisioned dev environment**, not just the happy path: `./tools/test-backend zerver.tests.test_slack_importer` (56/56 passing), `./tools/lint` and `./tools/run-mypy` clean, and `test-backend --coverage` showing zero uncovered lines in `zerver/data_import/slack.py` after the change, including the new guard path.

**One decision I explicitly left open for reviewers:** skipping a message with a broken `ts` versus synthesizing a fallback timestamp for it. Skipping loses the message but keeps the archive honest; a synthetic timestamp keeps the message but fabricates chronology. I went with skip-plus-warning because it matches the file's existing conventions, and flagged the tradeoff in the PR instead of pretending it does not exist.

## Best Use of Sentry

I instrumented the demo with `sentry-sdk` (`traces_sample_rate=1.0`, environment `bugsmash-demo`) and ran the exact same poisoned export twice: once with `zerver/data_import/slack.py` rolled back to `upstream/main`, once with the fix in place. Same branch, same data, one file different.

**Before the fix.** The import span dies with `KeyError: 'ts'`, attached right on the trace, status `internal_error`:

![Sentry trace of the failing import: KeyError 'ts' on the slack_import_demo span](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/8n25oj6rr3c9jzqj740z.jpeg)

Drilling into the issue gives the full stacktrace, pointing exactly where this PR points: `get_messages_iterator` -> `get_timestamp_from_message`:

![Sentry issue PYTHON-DJANGO-2: KeyError 'ts' with the stacktrace into get_messages_iterator](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/03gj221r7xaz1agy6662.jpeg)

And Seer's root-cause analysis of that issue. The diagnosis is spot on, down to quoting the exact poisoned message it pulled from the frame locals (`{"channel_name": "general", "text": "no ts field"}`):

![Seer agent root cause and suggested fix for the KeyError issue](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/n8apf4g08xqj13xbdlxo.jpeg)

One detail worth being honest about, precisely because a Sentry engineer judges this category: Seer's suggested one-liner, `float(message.get("ts", 0))`, is the fallback-timestamp option I explicitly declined in the PR. It fixes the missing-`ts` mode, but leaves the `ValueError` mode alive, waves `"NaN"` straight through into the sort, and stamps real messages with a 1970 `date_sent`. Its closing advice, though (log a warning and investigate the upstream data quality), is exactly what the shipped fix does. Reading Seer's output critically instead of pasting its patch is, I would argue, the intended use of the tool: it found the root cause in seconds; deciding the failure policy stayed my job.

**After the fix.** Same export, same transaction: zero issues, and the three skipped messages surface as three warning-level logs on the trace instead of one fatal:

![Sentry trace of the fixed import: 0 issues, 3 warning logs, import completed](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/z41x776xebcfb5jeyx7v.jpeg)

That pair of traces is the whole fix, told by monitoring: the same bad input, downgraded from an unhandled exception that kills a migration to three structured warnings on a completed run. (A pedantic footnote for anyone reading the trace metadata: both runs report release `c0b5d8c` because the red run rolled back only the module file, not the branch HEAD.)

---

The uncomfortable takeaway from failure mode 3: **"does it crash" is a terrible proxy for "is it correct"**, and the failure modes that skip the crash are the ones that survive into production. Which raises the question I left for the reviewers, and now for you: for a message that is otherwise fine but has a broken timestamp, would you skip it or synthesize a fallback `date_sent`? I picked skip. Convince me otherwise in the comments.
