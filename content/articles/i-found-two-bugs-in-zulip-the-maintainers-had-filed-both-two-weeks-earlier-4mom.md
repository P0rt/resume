---
title: I Found Two Bugs in Zulip. The Maintainers Had Filed Both Two Weeks Earlier.
slug: >-
  i-found-two-bugs-in-zulip-the-maintainers-had-filed-both-two-weeks-earlier-4mom
description: >-
  A Bug Smash hunting story: two rediscovered bugs, one claim-etiquette call, an
  unreported twin in the newest importer, and a disagreement with an AI about
  the right fix.
published: true
date: '2026-08-07T14:38:24Z'
updated: '2026-08-07T14:38:24Z'
readingTime: 7
tags:
  - devchallenge
  - bugsmash
  - python
  - opensource
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fcok5q8bdmf1phx76w558.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/i-found-two-bugs-in-zulip-the-maintainers-had-filed-both-two-weeks-earlier-4mom
devId: 4225297
canonicalUrl: >-
  https://sergei-parfenov.com/blog/i-found-two-bugs-in-zulip-the-maintainers-had-filed-both-two-weeks-earlier-4mom/
---

*This is a submission for [DEV's Summer Bug Smash: Smash Stories](https://dev.to/bugsmash) powered by [Sentry](https://sentry.io/).*

I went hunting in Zulip's codebase for this challenge and found two real data-corruption bugs in the Slack importer. Solid ones: silent message scrambling during workspace migrations, the kind of bug that costs somebody a re-migration.

Then I did the thing you are supposed to do before writing a single line of fix. I searched the tracker.

Issue [#39650](https://github.com/zulip/zulip/issues/39650). Opened June 30, by the maintainers themselves: a systematic audit of the Slack import path, roughly a dozen items, confirmed and triaged. My two discoveries were on that list, described more precisely than I would have described them. **I was two weeks late to my own findings.**

This is the story of what happened next, because "what happened next" turned out to be the useful part.

> **TL;DR:** Hunted in Zulip → found 2 real bugs → both already filed by the maintainers (#39650) → the maintainer was already fixing them in an open PR (#39757) → pivoted twice: found an unreported latent twin of the bug class in the newest importer (Microsoft Teams), and claimed the one confirmed item the maintainer's PR did not touch (an unguarded timestamp sort key, which turned out to hide a silent NaN failure mode on top of the two loud ones). Shipped two PRs ([#39813](https://github.com/zulip/zulip/pull/39813), [#39814](https://github.com/zulip/zulip/pull/39814)), each with a test that fails on the old code. Lessons at the end.

## Picking the hunting ground

Why Zulip: it is on this challenge's suggested repo list, it is Python, and it has a reputation that makes hunting interesting rather than easy. Near-total backend test coverage, strict mypy, ruthless linting, and a commit discipline of "each commit is a minimal coherent idea". I ran an extended ruff pass over the whole backend just to check the floor. Nothing but style noise. **Lint-level bugs do not survive in this codebase.**

Which leaves logic-level bugs, and for those you want a subsystem where correctness is hard and the inputs are hostile. Data import is exactly that: long batch jobs over *other tools'* export files, arbitrary data quality, and no retry culture, because a workspace migration is a one-shot event for the admin running it. One unhandled edge case on message 31,000 of 50,000 and the whole thing is off.

## The two bugs I "found"

**Bug one: thread state does not survive chunk boundaries.** Slack messages stream through the converter in chunks of 1,000. The map that routes thread replies to their Zulip topics was allocated *inside* the per-chunk function. Thread root in chunk N, replies in chunk N+1: the replies land in an orphan topic literally named `"... No channel message"`. The detail that makes it art: the *adjacent* cache in the same file was deliberately made module-global, with a comment explaining that it must survive across calls. One cache got the cross-chunk treatment. Its sibling, added later, did not.

**Bug two: the thread key is truncated to seconds.** A thread's identity was computed as `strftime("%Y/%m/%d %H:%M:%S")` plus the parent's user id. No channel component. No microseconds, even though Slack's raw `ts` carries them, as a string, right there in the message. Any bot that posts twice within one second and collects replies on both messages: two distinct threads merged into one topic, conversations interleaved.

Both bugs are silent. No exceptions, no warnings, just a migrated archive that is quietly wrong.

I was fairly pleased with myself for about as long as it took to search the tracker.

## The tracker, and the etiquette call

Finding #39650 stung, then got worse in an instructive way: [PieterCK](https://github.com/PieterCK), the maintainer who owns the importers, already had an open PR, [#39757](https://github.com/zulip/zulip/pull/39757), "slack_importer: Fix Slack thread conversion bugs". I opened its Files changed tab with a sinking feeling. Both of my thread bugs: being fixed, by the person whose code it is, with more context than I will ever have.

This challenge has a section called "Smash Bugs, Respectfully", about not adding to maintainer workload. Racing a maintainer's open PR on their own audit items is a textbook way to fail it. So: **stand down on the thread bugs.** Not negotiable, and honestly not even disappointing once framed correctly, because independently rediscovering two items from a maintainer audit is not wasted work. It is calibration. My nose was pointing at real bugs; it was just pointing at them second.

If the audited file is picked clean, two moves remain: find what the audit *missed* elsewhere, and find what the audit *found* but nobody claimed.

## Move one: same disease, newer organ

Audits cover files, but bug classes travel across files, carried by copy-paste and by shared habits. So I took the bug classes from the Slack audit and checked the sibling importers. Mattermost: clean on these classes, different batching helper. Microsoft Teams, the *newest* importer in the family: jackpot.

Its batching generator yielded a list and then called `.clear()` on the same object to build the next batch. Run the minimal version yourself:

```python
list(batched(range(12), 5))
# expected: [[0..4], [5..9], [10, 11]]
# actual:   [[10, 11], [10, 11], [10, 11]]
```

Every yielded batch is one shared list. Ten of twelve messages gone, zero exceptions. The bug is latent: Zulip's current caller consumes each batch before advancing, so nothing fires today. It is still a broken contract, because the consumer owns a yielded value, and every future consumer inherits a trap that silently destroys data during a one-shot migration. Nobody had reported it. That became PR [#39814](https://github.com/zulip/zulip/pull/39814), and the "why fix a latent bug" argument became [its own submission][LINK: Teams Clear the Lineup post].

## Move two: the confirmed item nobody took

Back in #39650, one high-impact robustness item sat confirmed and unclaimed: the unguarded timestamp sort key. `float(message["ts"])`, used to sort every message of the export and as `date_sent`. I checked the maintainer's open PR for it, Ctrl+F in Files changed: **not found.** Free.

The item as filed had two failure modes: missing `ts` raises `KeyError`, garbage `ts` raises `ValueError`, either one aborts an entire import because of one message. Writing the guard surfaced a third mode that nobody had listed, and it is the best souvenir of this whole hunt: `"ts": "NaN"`. `float("NaN")` parses without complaint. NaN compares as False against everything, which quietly violates the total ordering Timsort assumes, so `sorted()` returns an inconsistent order. No crash, no warning, scrambled chronology. **The crash is the lucky failure mode.** That is why the shipped guard requires `math.isfinite`, not just a successful parse. This became PR [#39813](https://github.com/zulip/zulip/pull/39813) and [its own submission][LINK: Slack Clear the Lineup post].

## Boring discipline, on purpose

Both fixes went through the same routine. Write the regression test first, roll the source back to `upstream/main`, and watch the test fail with the exact predicted error: `KeyError: 'ts'` for the Slack guard, `AssertionError: 24 != 29` for the Teams aliasing (the batches measurably eat messages). Then restore the fix and run everything: 56/56 on the Slack importer module, 10/10 on Teams, lint and mypy clean, coverage showing no uncovered lines in the touched Slack module. A regression test that never failed against the old code is a test fitted to the fix, not a test of the fix.

Full disclosure on process: the mechanical part of this hunt (cloning, grepping, running suites) went through AI agent tooling; every call you have read about, from which repo to whose bug not to race to which failure policy to ship, stayed human. Zulip has an explicit AI-use policy for contributions, and both PRs follow it.

## Epilogue: arguing with the robot

For the other track's submission I wired the crash into Sentry and asked Seer, its AI debugger, for a root cause. Credit where due: Seer nailed the diagnosis in seconds, down to quoting the exact poisoned message it pulled from the frame locals. Then it suggested a fix: `float(message.get("ts", 0))`.

That one-liner is the fallback-timestamp option I had already declined in the PR. It patches the missing-`ts` mode, leaves `ValueError` alive, waves `"NaN"` straight through into the sort, and stamps real messages with a 1970 `date_sent`. One failure mode out of three, plus fabricated chronology. The tool found the root cause faster than I would have; deciding the failure *policy* was still my job. I suspect that division of labor is going to describe a lot of debugging from here on.

## What I am taking away

1. **Freshly audited ground is picked clean. Hunt where the code is newest.** The Slack importer had a dozen filed bugs and zero available ones; the newest importer had an unreported twin waiting.
2. **Rediscovery is calibration, not waste.** Going two-for-two against a maintainer audit told me the method works; it just needs to run earlier or elsewhere.
3. **"Filed" is not "fixed".** A confirmed, high-impact item sat unclaimed for over three weeks in one of the best-maintained Python codebases around. Trackers are full of these.
4. **Read the open PRs before you race them.** The most useful contribution I made to the thread bugs was not making one.
5. **The crash is the lucky failure mode.** The loud errors were filed by an audit; the silent NaN mode was not. The bugs that skip the crash are the ones that make it to production, and to your archives.

Have you ever arrived two weeks late to your own discovery? And did you file it under wasted effort, or under proof your nose works? I have firmly moved to the second column.

## The paper trail

- The maintainers' audit: https://github.com/zulip/zulip/issues/39650
- The maintainer's thread-fix PR: https://github.com/zulip/zulip/pull/39757
- My Slack timestamp guard: https://github.com/zulip/zulip/pull/39813
- My Teams batching fix: https://github.com/zulip/zulip/pull/39814
- The challenge's "Smash Bugs, Respectfully" guide: https://dev.to/opensourcepledge/how-to-respectfully-contribute-to-open-source-cbh
