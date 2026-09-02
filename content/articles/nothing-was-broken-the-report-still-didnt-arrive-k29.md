---
title: Nothing Was Broken. The Report Still Didn't Arrive.
slug: nothing-was-broken-the-report-still-didnt-arrive-k29
description: >-
  An agent pipeline in production skipped its daily report and no component was
  at fault. The audit that followed found four bugs in our own code, and every
  one of them was silent.
published: true
date: '2026-07-26T13:50:33Z'
updated: '2026-07-26T13:53:57Z'
readingTime: 11
tags:
  - devchallenge
  - bugsmash
  - ai
  - observability
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fc0rdavlgvlpiaa57an1t.png
source: dev
sourceUrl: 'https://dev.to/p0rt/nothing-was-broken-the-report-still-didnt-arrive-k29'
devId: 4236855
canonicalUrl: >-
  https://sergei-parfenov.com/blog/nothing-was-broken-the-report-still-didnt-arrive-k29/
---

*This is a submission for [DEV's Summer Bug Smash: Clear the Lineup](https://dev.to/bugsmash) powered by [Sentry](https://sentry.io/).*

On July 24 at 09:00 Berlin time, the doctors group did not get its daily digest. It got the first half of one, unfinished. Nobody noticed.

The failure was recorded correctly, in a state file that nothing reads. The job's delivery mode was `none`. The fallback alert channel had been dead since June 13, for reasons that turn out to be bug four. So the run failed, the record was written, and the information stopped there.

Here is how our team actually learns that something broke. Different job, same pipeline:

![Telegram message from the bot reporting a failed cron job, with a doctor replying and tagging the CTO](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/ll1ikpkxlnb8lc0m7uxw.png)
*The failure the team actually saw: a doctor's scheduled job died and she had to tag the CTO in chat. This is what «silent» pipelines look like when they finally speak.*

Some context, since everything below assumes it. Symptomato is a telehealth service: patients describe symptoms in a chat, doctors answer them from a helpdesk. Sympy is the agent that works the seam between the two - on a schedule it reads the doctors' inbox and tells them, in Telegram, which conversations need a human today. Nobody watches it run. That is the point of it, and it is also why a broken run can go unnoticed for six weeks.

So I went looking for the bug behind the missing digest. That is the uncomfortable part: there wasn't one.

**TL;DR:** an agent run failed with no defective component anywhere in the path. That non-incident triggered a full audit of the pipeline, which turned up four bugs in our own code that nobody had ever seen fail. All four have the same shape: a function that does not know something reports a value instead of admitting it. This post is those four fixes, plus the instrumentation that makes this failure class visible, plus a deliberate decision to record none of the message content while doing it.

## Project Overview

Under the hood: a self-hosted agent runtime with a job scheduler, a tool plugin we wrote on top of [Chatwoot](https://www.chatwoot.com/) (the helpdesk our doctors work in), a set of host-side Python cron scripts, and Telegram as the delivery channel. Three scheduled jobs do the boring work: a morning digest of conversations that need attention, pings when a paid consultation goes 24 hours without a doctor reply, inbox prechecks.

One constraint shapes everything below: patient conversations contain medical text. Any observability we add has to work without recording message bodies.

## Bug Fix or Performance Improvement

### The incident with no bug in it

The digest agent sent its first Telegram message, then decided to finalize the digest by editing that message instead of sending a second one. The message tool requires a recipient field even for an edit. The edit call did not have one. The tool rejected it, the turn ended, the scheduler marked the run as `error`.

Walk that path again and look for the defect. The tool validated its input exactly as its schema says. The scheduler recorded the failure exactly as designed. The model picked a legal tool sequence that the prompt never forbade. Every component behaved to spec, and the doctors still had no digest.

This is the failure mode that makes agent pipelines different: the execution path is chosen at runtime by a model, so "correct components" and "correct behavior" stop being the same claim. Yesterday the same job sent one message and worked. Today it chose send-then-edit and did not. There is no line of code you can point at, and no test that fails, because nothing is deterministic enough to fail.

Once instrumented, the same failure looks like this. The capture is from the replay run - the July 24 failure itself predates the instrumentation - and it needed no code changes at the failure site:

![Sentry issue detail showing ToolInputError with raw params and a breadcrumb trail ending in a Telegram API call](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/u5ozqurq4bn5nqze770v.png)
*The anchor bug, captured automatically: the model chose «send, then edit», and the edit call has no `to`. The tool that failed lives in the runtime, not in our code - we never instrumented it; the error was scraped from the gateway's ERROR log lines and turned into an issue.*

![Sentry Seer panel reconstructing the root cause of the issue from breadcrumbs](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/0ptpb68u5hqwx6vn9az9.png)
*Seer reconstructs the failure from breadcrumbs alone - no prompts, no message bodies were ever recorded.*

### The four bugs the audit did find

A missing digest with no defect in it is a bad place to stop, so I audited the pipeline properly: the tool plugin, the scheduler jobs, the host scripts, the existing telemetry extensions. It came back with a list. Four items on that list turned out to be the same bug wearing different clothes, and I only saw the pattern once I wrote them down next to each other.

**1. The tool reports a conversation status it never looked up.** `getConversationSummary` returns `status: "open"` as a literal, for every conversation, always. The real status sits in the API response one method below. So when the agent asks "is this conversation still open", it is told yes, unconditionally. Every judgment the model makes about whether to act on a conversation rests on a constant.

**2. The tool returns page one and calls it the inbox.** `listConversationsByInbox` fetches `page=1` and returns the payload with no `all_count` check and no truncation marker. Chatwoot paginates at 25. Our host-side Python script got this right and loops until the count matches; the agent tool never did. So on any day with more than 25 open conversations, the model receives 25 and narrates them as the full picture, which is exactly the sort of confident summary you cannot catch by reading the output.

**3. "The data isn't there yet" gets cached as a fact.** `tariff_from_triage_note` returns `"unknown"` for two very different situations: the note is unparseable, and the note has not been posted yet. The caller caches the result unconditionally, and `"unknown"` is truthy, so the next run short-circuits on the cache and never looks again. A patient whose chat is scanned in the window before the backend posts its triage note is marked `unknown` permanently, which means the 24-hour ping that exists specifically for paid one-time consultations never fires for them.

**4. The error handler reports failures through the channel that just failed.** Our host digest script calls a Telegram helper with no error handling, catches the resulting exception, and then tries to report that exception with the same helper, which raises again. Since June 13 the script has ended in a double traceback - 128 of them in the log - and every one of those runs paid for a model call before crashing. Next to it, the monitor script ends its send with `> /dev/null 2>&1`, so a failed alert is indistinguishable from a delivered one anywhere in the system.

Now the shape. In every one of these, something the system does not know is represented as something it does know. Unknown status becomes "open". Twenty-five of thirty becomes "the inbox". A missing note becomes a tariff value, cached forever. A failed alert becomes a successful one. Three of the four never raise at all; the fourth raises twice a day into a log nobody reads, which comes to the same thing. All of them produce plausible output. And the incident that started the audit is the same thing one level up: a failed run represented as nothing at all.

## Code

The status bug is the smallest and my favorite, because the correct value was already in scope. The whole thing is one line:

```js
return { id: conversationId, status: "open", messages: formatted };
```

`status` is a literal. The real value sits in the conversation payload that the method one level below already fetches - the fix is to read it from there instead of asserting it.

Pagination was ported from the host script that already did it right, plus an explicit truncation marker on message reads, so a partial conversation announces itself instead of passing as complete.

The tariff cache stops recording ignorance as knowledge:

```python
# before
tariff = tariff_from_triage_note(cid, cw_token)
entry["tariff"] = tariff          # cache: note content is immutable

# after
tariff = tariff_from_triage_note(cid, cw_token)
if tariff != "unknown":           # "not posted yet" is not a value
    entry["tariff"] = tariff
```

This does not distinguish the two «unknown»s either; it stops trusting them. An unparseable note now costs a re-read every run instead of being wrong forever, which is the trade I want.

And the alerting path: the Telegram helper handles its own failures and logs them, the error handler no longer depends on the channel that just failed, and chunking - a fifth thing I fixed while I was in there - splits outside HTML tags instead of through them.

One thing I am deliberately not calling a fix: the prompt line telling the digest job to send once and never edit. It patches today's symptom and it took ten seconds, but it is an instruction to a stochastic system, not a repair. The actual answer to the opening incident is not in the prompt. It is that a failed run now reaches someone, instead of a file nothing reads.

## My Improvements

Every fix went red before it went green. The pagination and tariff bugs got standalone repro scripts against local mocks, with the buggy implementation copied verbatim, so the failure is demonstrated rather than argued:

```plaintext
open conversations in inbox:      30
agent check_inbox list_open sees: 25  (ids 1..25)
host precheck list_open sees:     30  (ids 1..30)
=> 5 conversations invisible to the LLM agent, no truncation signal returned
```

```plaintext
run 1 (triage in progress): tariff='unknown'  cached={'tariff': 'unknown'}
run 2+ (note now present):  tariff='unknown'  (cache short-circuits, note never re-read)
24h ping fires: False   (correct behaviour would be: True)
```

For the digest incident itself, the replay went into a private test group rather than the doctors group, running the same job with the same shape of payload:

![Telegram test group showing two unedited RED demo messages and one GREEN demo message](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/93zp7pmyapgyzbxf35n6.png)
*RED replay: the agent sends, then tries to edit - the edit dies, the message stays raw. GREEN: same job, one send, no edit.*

The RED runs are the interesting ones. The message is still sitting there in its raw, pre-edit state, which is precisely how this failed in production: not with an absence, but with a half-finished artifact that looks close enough to a real digest to be skimmed past.

## Best Use of Sentry

The instrumentation is the other half of the fix, because the four bugs above are the ones I found. The category of "silent wrong answer" is not exhausted by an audit, so the pipeline needs to be able to report on itself. Three independent sources now feed one stream: errors scraped from the runtime's own error log lines, failures inside our agent tools, and cron monitors that stop hearing from a job.

![Sentry issue stream with three numbered issues: a core tool error, an agent tool failure and a cron monitor failure](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/cn7ddjhd8lq3fywjpqfi.png)
*Three different origins, one stream: (1) a core tool error scraped from the runtime's ERROR log lines, (2) a failure inside one of our own agent tools, (3) a cron monitor that stopped hearing from its job. The unnumbered rows are the same machinery catching unrelated faults.*

When one of our tools fails, the HTTP call that caused it arrives attached, which turns "the agent said something odd this morning" into a five-second read:

![Sentry breadcrumbs showing an agent tool failure and the Chatwoot HTTP request that caused it](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/iczvv0ukofzed1svk52l.png)
*An agent tool failure with the exact HTTP call that caused it - attached automatically as breadcrumbs.*

Every tool call is now a span with the attributes that matter for this pipeline, and none of the attributes that would put patient text into a third-party system:

![Attributes tab of a gen_ai.execute_tool span in Sentry showing tool name, action and conversation id](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/fbajxyqtj0ntdvg321lw.png)
*Every agent tool call is a span: tool name, action, numeric conversation id, latency, error status. Nothing in that list is message content - that is the whole design.*

The tool's own Input and Output tabs are where the arguments and the result would sit. They are empty, and that is deliberate:

![Sentry AI tab showing the trace as a timeline of model calls and tool calls, with an empty Input tab](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/txazqo6nqr1gwvph3vhi.png)
*The same run in Sentry's AI view - model calls and tool calls in sequence, with the selected tool's Input tab empty: arguments and responses are never recorded (PHI).*

Model calls get the same treatment, including the ones nobody is watching, which for this agent is most of them:

![Attributes of a gen_ai.chat span in Sentry showing model, provider, conversation id and timings](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/5tcxjzstpg832iw70wmk.png)
*One span per model call - model, provider, conversation id, latency, time to first byte. Emitted for background cron runs too, which is where this agent does most of its work.*

And they correlate, which is what makes an agent run debuggable at all: the model call, the tool call it triggered, and the outbound HTTP request that tool made, in one waterfall.

![Sentry trace waterfall of one agent run: a model call, a tool call and the outbound HTTP request](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/kje6d1jmo6sv1h6ayy5f.png)
*One agent run, one trace: the model call, the tool call it triggered, and the outbound HTTP request - correlated through the runtime's own trace context.*

Token usage and cost land at run level, keyed by conversation:

![Attributes of a gen_ai.invoke_agent span showing token usage and dollar cost per agent run](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/ehf0c228bwihr48l1sqf.png)
*Run-level usage: tokens in/out and dollar cost per agent run, keyed by conversation id - the cheapest possible answer to «what is this agent costing us».*

Then the piece that speaks to the failure mode underneath the opening incident. Error monitoring catches runs that fail. It cannot catch runs that stop happening, and it cannot catch a delivery that quietly goes nowhere. Cron monitors turn a schedule into an expectation, and check-ins into evidence. (The red one below is the host digest script from bug four, not the doctors' digest from the opening: two different jobs, one failure mode.)

![Sentry cron monitors list with one failing and two healthy monitors](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/55pab4ayqxs0wemgym66.png)
*Three host crons, monitored from code (no UI setup). The red one is the script from bug four - it has been failing since June 13, and the monitor is the first thing in six weeks to say so out loud.*

![Sentry cron monitor detail page showing missed and failed check-ins and an ongoing issue](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/3thoxinpqeifljzbbewm.png)
*Missed, missed, failed. A job that stops running produces no error at all, and a job that fails into a log nobody reads produces none that anyone sees - a cron monitor turns both into the same alert.*

Six weeks of that script crashing on schedule would have been one alert on day one.

On the PHI side, the deliberate choice: prompt and response recording is off. The safe list is model id, provider, token counts, cost, durations, tool name and action, numeric conversation ids, session key, job id, outcome. Anything string-valued that comes from message content goes through redaction or does not get sent. The result is a monitoring stack that can tell me a tool failed, which tool, on which conversation id, how long it took and what it cost, and cannot tell me or anyone else what the patient wrote.

![Sentry AI transcript tab stating that the conversation's messages were not captured](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/din9tmpee60ehclopehd.png)
*Sentry offers a full conversation transcript for AI traces - and for this agent it is empty by construction: «This conversation's messages weren't captured».*

That empty transcript is not a gap in the setup. It is the setup.

## What I took away

The bug I went looking for did not exist, and the four I found were all the same bug wearing different clothes: a component that could not distinguish "I don't know" from a value, and picked a value. In ordinary code, that produces a wrong answer somewhere downstream and usually an exception eventually. In a pipeline where a language model reads those answers, it produces a fluent, confident, well-formatted summary of a reality that is 25 conversations wide instead of 30, and nobody downstream has any way to tell.

So the question I am still working on, and would like yours on: in your own systems, how do you tell the difference between an agent run that went fine and an agent run that quietly took a path that does not work? Error rates will not show it. Neither will the output, because the output always looks great.
