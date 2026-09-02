---
title: This Bug Has Never Fired in Production. I Fixed It Anyway
slug: this-bug-has-never-fired-in-production-i-fixed-it-anyway-ga6
description: >-
  A Python generator in Zulip's Microsoft Teams importer yielded a list and then
  cleared it. Every batch was the same object. Here's why latent bugs deserve
  fixes.
published: true
date: '2026-08-05T10:23:33Z'
updated: '2026-08-05T10:23:33Z'
readingTime: 4
tags:
  - devchallenge
  - bugsmash
  - python
  - opensource
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fszqjoo2qd70yfal0ti1e.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/this-bug-has-never-fired-in-production-i-fixed-it-anyway-ga6
devId: 4225264
canonicalUrl: >-
  https://sergei-parfenov.com/blog/this-bug-has-never-fired-in-production-i-fixed-it-anyway-ga6/
---

*This is a submission for [DEV's Summer Bug Smash: Clear the Lineup](https://dev.to/bugsmash) powered by [Sentry](https://sentry.io/).*

Run this and predict the output:

```python
def batched(messages, chunk_size):
    batch = []
    for m in messages:
        if len(batch) == chunk_size:
            yield batch
            batch.clear()
        batch.append(m)
    if batch:
        yield batch

list(batched(range(12), 5))
```

Expected: `[[0..4], [5..9], [10, 11]]`. Actual:

```python
[[10, 11], [10, 11], [10, 11]]
```

All three elements are **the same list object**. Ten of twelve messages are gone, no exception raised. This exact pattern was sitting in Zulip's Microsoft Teams importer, and the interesting part is not the fix (one line). It is that the bug has never fired in production, and I think that made it *more* worth fixing, not less.

> **TL;DR:** `get_batched_export_message_data()` in Zulip's Teams importer yielded a batch list, then cleared and refilled the same object for the next batch. Safe for the current lazy consumer, silently destructive for any consumer that retains batches (starting with `list(...)`). My fix ([zulip/zulip#39814](https://github.com/zulip/zulip/pull/39814)) hands ownership of each yielded list to the consumer, plus a regression test that materializes the generator and fails on the old code with a concrete data-loss assertion: `24 != 29`.

## Project Overview

[Zulip](https://github.com/zulip/zulip) is an open-source team chat server (Django/Python, ~25k stars) with a famously strict engineering bar: near-total backend coverage, strict mypy, "each commit is a minimal coherent idea".

The Microsoft Teams importer in `zerver/data_import/` is the newest member of Zulip's data-import family: it converts Teams export files into Zulip's format, reading messages and yielding them in batches of `chunk_size` for downstream processing. Newest code, fewest eyes: that is exactly where I went hunting, after discovering that the older Slack importer had just been through a full maintainer audit.

## Bug Fix or Performance Improvement

The old batching generator:

```python
batched_messages: list[MicrosoftTeamsFieldsT] = []
for path in message_data_paths:
    messages = get_data_file(path)
    for message in sorted(messages, key=lambda m: int(m["Id"])):
        if len(batched_messages) == chunk_size:
            yield batched_messages
            batched_messages.clear()   # <-- the bug
        batched_messages.append(message)
if batched_messages:
    yield batched_messages
```

`yield` suspends the generator, the consumer processes the batch, and on the next `next()` the generator wakes up and calls `.clear()` on **the object it just handed out**. Every yielded batch is one shared list in memory.

This is a violation of an implicit contract: **the consumer owns a yielded value.** As long as consumption is strictly lazy (process each batch fully before advancing) nothing visible happens, which is why the current Zulip caller works. But the moment any consumer *retains* batches, the simplest being `list(generator)`, it gets N references to a single object containing only the final batch's contents. Data is not lost loudly; it is silently replaced. In the importer's test dataset, the total message count collapses from 29 to 24 with zero exceptions.

The standard library agrees on the contract, by the way: `itertools.batched` allocates a fresh tuple per batch. So does every batching recipe in the itertools docs. `clear()`-and-refill looks like a memory optimization; what it actually optimizes away is correctness under any future change to the consumer: buffering, retries, parallel prefetch, or a colleague writing `list(...)` in a test.

## Code

PR: **[zulip/zulip#39814](https://github.com/zulip/zulip/pull/39814)** (branch `P0rt:teams-batch-aliasing`, single commit, +21/-1).

```python
if len(batched_messages) == chunk_size:
    yield batched_messages
    # Start a new list rather than clearing the yielded one;
    # the consumer owns the yielded list, and mutating it here
    # would corrupt every batch if the generator is materialized
    # (e.g. with list(...)) or batches are retained across
    # iterations.
    batched_messages = []
```

One line of code, six lines of comment. That ratio is deliberate: the fix is trivial, but the *reason* it must stay this way is not visible from the code, and the whole failure mode exists because a past "optimization" looked equally trivial.

## My Improvements

**The test asserts the contract, not the current caller.** I extended the existing `test_get_batched_export_message_data` to materialize the generator with `list(...)` and then check two things: the total message count across all batches, and the exact flattened sequence of message IDs against the sorted source files. That second assertion is the important one; it catches loss, duplication, and reordering in a single check, so the test defends the ownership contract rather than one symptom.

**Red phase before green phase.** With the source file rolled back to `upstream/main` and the new test kept, the run fails with `AssertionError: 24 != 29`: the aliasing measurably eats messages. With the fix restored, the full module passes: `./tools/test-backend zerver.tests.test_microsoft_teams_importer`, 10/10. `./tools/lint` and `./tools/run-mypy` clean on the branch.

**Why fix a bug that never fires?** Because "latent" describes the caller, not the function. The function's contract is broken today; the current caller just happens not to lean on the broken part. Every future consumer inherits a trap that produces silent data corruption during a one-shot, high-stakes operation (a workspace migration is not a request you can retry). The cost of the fix is one allocation per batch. The cost of not fixing it is a debugging session that starts with "the import succeeded but a fifth of the messages are missing", which is close to the worst bug report a data migration can generate.

---

I keep coming back to one framing from this fix: **tests that only cover your current callers are tests of an implementation; tests that cover the contract are tests of the function.** The first kind rots the moment anyone new calls your code. Where do you draw that line in your own test suites: do you test what the function promises, or what today's callers happen to need?
