---
title: You Fixed the Rate Limits. Now Your Agent Fails Quietly.
slug: you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo
description: >-
  Every capacity fix - retries, fallbacks, caching - buys availability by acting
  on output it didn't freshly earn. Why uptime and correct uptime are different
  SLOs, and how to engineer the second one.
published: true
date: '2026-06-11T16:58:21Z'
updated: '2026-06-12T11:22:25Z'
readingTime: 8
tags:
  - ai
  - llm
  - devops
  - machinelearning
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fm297ch4u289urwnt8yle.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo
devId: 3876015
canonicalUrl: >-
  https://sergei-parfenov.com/blog/you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo/
---

Last week I wrote that [your agent isn’t failing because it hallucinates - it’s failing because of rate limits](https://dev.to/p0rt/your-ai-agent-isnt-failing-because-it-hallucinates-its-failing-because-of-rate-limits-2d60). The capacity-engineering toolkit in that post - concurrency caps, backoff with jitter, fallback models, caching - is real and it works. Deploy it and your agent stops dying.

Then a commenter (ANP2) pointed out the thing the post undersold, and it’s been stuck in my head since: **every one of those fixes quietly opens a correctness hole while it closes the availability one.** This post is me paying that comment thread its due, because the second half of the story turns out to matter more than the first.

> **TL;DR** - A 429 is a *loud* failure: you see it, you alert on it, you fix it. Retries, fallbacks, and caches keep the agent alive - but they let it act on output it didn’t freshly earn: a stale cache hit, a different model’s answer, a re-run side effect. You’ve traded loud failures for quiet ones. The fix is to treat **availability** (“can I serve this?”) and **correctness** (“can I still trust the result?”) as two separate gates - and to propagate trust *across the agent’s chain*, not just per call.

## The trade you didn’t know you made

Here’s the uncomfortable symmetry. The whole point of my last post was that the dominant production failure mode isn’t the model being wrong - it’s the plumbing saying no. The capacity toolkit fixes the plumbing. But look at what each fix actually does:

- **A retry** re-runs a call. If that call had a side effect - created a ticket, sent a message, committed a change - the retry runs the side effect *again*. The agent didn’t fail; it succeeded twice, which is its own kind of wrong.
- **A fallback model** answers when the primary is rate-limited. But it’s a different model: different training, different calibration, different failure modes. The task continues on an answer the primary never produced.
- **A cache hit** serves a response generated for an earlier input. If the world moved - the codebase changed, the data updated - the cached answer can be subtly stale for *this* request while looking perfectly fresh.

Each mechanism keeps the agent **up**. None of them guarantees the agent is **right**. And the cruel part is the failure economics: the 429 you eliminated was honest - visible, countable, alertable. The failures you bought instead are silent. The agent stays up and is confidently wrong, which is exactly the failure mode the hallucination-hunters were worried about in the first place - just arriving through the plumbing instead of the model.

The reliability you bought is **uptime, not correct uptime**. (That phrase is ANP2’s, and it’s better than anything in my original post.)

## Two gates, not one

The conversation in that thread converged on a framing I now use everywhere: an agent’s runtime layer has to answer two different questions, and conflating them is where the quiet failures breed.

**Gate 1 - “Can I serve this?”** This is the availability gate. Trip the fallback on 429s, serve the cache on a hit, retry on transient errors. Another commenter (Echo) nailed the key property of this gate: when you trip a fallback *only on rate-limit errors* - never on bad outputs - the failure mode you’ve introduced is **latency, not quality**. The fallback just buys time. That’s a fine trade, and it’s why the capacity toolkit is still the right first move.

**Gate 2 - “Can I act on this irreversibly?”** This is the correctness gate, and it’s where the degraded outputs from Gate 1 must get re-examined. The moment an output is about to feed something you can’t take back - a merge, a payment, a message to a user, a deleted record - its *provenance* matters. Did it come from the primary, fresh? Or from a fallback, a cache, a retry?

One rule worth stealing here: **gate on risk, not on confidence.** There’s a war story making the rounds of an agent that was 95% confident about a production database migration - the missing 5% was a foreign-key constraint absent from its test data, and the only thing that prevented corrupted referential integrity across three tables was a hard rule that destructive operations always require human approval, *regardless of confidence*. Confidence is the model grading itself; irreversibility is a property of the action. Gate on the second.

The two gates fail differently, and that’s the point: Gate 1 failures cost you time; Gate 2 failures cost you trust. A system with only Gate 1 is fast and quietly dangerous. A system with only Gate 2 is safe and constantly down. You need both, and they need to stay separate.

## Per-call correctness: the three tags

The minimum viable version of Gate 2 is making degraded outputs *identifiable*. Three mechanisms, one per capacity fix:

**1. Idempotency keys on anything with side effects.** Before an agent action that touches the world, generate a key from the task + step + inputs. The receiving system deduplicates on it. Now a retry is safe by construction - the second execution is a no-op instead of a double-fire. This is decades-old distributed-systems practice; agent frameworks have mostly just… not adopted it yet.

```python
import hashlib, json

def idempotency_key(task_id: str, step: int, payload: dict) -> str:
    raw = json.dumps({"t": task_id, "s": step, "p": payload}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]

# pass it with the side-effecting call; the receiver dedupes on it
create_ticket(..., idempotency_key=idempotency_key(task.id, step.n, args))
```

The grown-up version of this is the **saga pattern** from distributed systems: each step records its completion and defines a compensation action, so a task that dies at step 4 of 7 can roll back cleanly instead of orphaning state. Idempotency prevents duplicate effects; sagas handle partial completion. Once your agents fail mid-workflow - and they will - you eventually want both.

**2. Trust tags on fallback outputs.** When the fallback answers instead of the primary, don’t just return the text - return `(text, trust="degraded")`. Cheap to add, and it’s the hook everything downstream needs. A degraded answer is fine for the agent to *keep thinking with*; it is not fine to *act irreversibly on* without a re-check.

**3. Validity conditions on cache entries.** A cache entry shouldn’t just store the response - it should store what the response *assumed*: which file version, which data snapshot, which config. On a hit, check the assumptions, not just the key. If the codebase moved since the entry was written, that’s a miss wearing a hit’s clothes. And the assumptions can move without you touching anything: providers silently update models, document stores drift, input distributions shift - degradation with no error to catch. Your “primary, fresh” answer from last Tuesday may already be a fallback in disguise.

## The part single calls don’t prepare you for: trust must propagate

Here’s where agents make this genuinely harder than classic distributed systems, and it’s the piece I’d add on top of the thread that started this post.

Say step 3 of a 6-step task came from a lower-trust fallback. Steps 4, 5, and 6 each run on the primary, fresh, individually flawless. Are they trustworthy?

No - and this is the trap. **They reasoned on top of a degraded input.** This isn’t a niche concern, either: observability vendors who cluster production agent traces report that *chained corruption* - one bad step at position N silently poisoning everything after it - is the single most common and most insidious agent failure mode they see. And the math is brutal: at a 95% per-step success rate, an 8-step task completes cleanly ~66% of the time; at 85% per step, it’s ~27%. The chain is where reliability goes to die, quietly. Each step is locally correct and the trajectory is still poisoned. If the trust tag stays local to the call that produced it, the degraded answer launders itself: two “clean” hops later it looks pristine, and your irreversibility gate at step 6 checks the last call’s tag, sees green, and fires.

So the tag can’t be per-call metadata. It has to **taint** - propagate to everything downstream of it, the way taint-tracking works in security analysis:

```python
@dataclass
class StepResult:
    output: str
    trust: str          # "full" | "degraded"
    tainted_by: set[str]  # which upstream steps were degraded

def propagate(inputs: list[StepResult], my_trust: str) -> tuple[str, set[str]]:
    taint = set().union(*(r.tainted_by for r in inputs))
    taint |= {r.step_id for r in inputs if r.trust == "degraded"}
    # my own trust can't exceed the weakest input
    trust = "degraded" if taint or my_trust == "degraded" else "full"
    return trust, taint
```

Then the irreversibility gate checks the **aggregate trust of the whole trajectory**, not the last hop: if anything upstream was degraded and unverified, the action pauses for a re-check - re-run the degraded step on the primary, or escalate to a human. In my experience the re-check fires rarely; the point isn’t that fallbacks are usually wrong, it’s that the one time the degraded path feeds a merge or a payment, you want it caught at the gate instead of in the incident review.

## Making it observable (or it didn’t happen)

Same lesson as the capacity post, one level up. You can’t engineer what you can’t see, and correctness debt is even quieter than 429s. The minimum dashboard:

- **% of completed tasks with any degraded step** - your real exposure, invisible in error rates because nothing errored.
- **% of irreversible actions that fired with taint** - should be ~zero; every one is a gate you skipped.
- **Cache validity-miss rate** - hits that failed the assumption check. If this is zero, you’re probably not checking assumptions.
- **Fallback divergence** - periodically replay fallback-answered requests on the primary and diff. This is your measured answer to “how different is the fallback, actually?” instead of a vibe.

None of these show up in uptime. All of them are the difference between uptime and correct uptime.

## The takeaway

The capacity toolkit from the last post is still step one - an agent that’s down helps nobody. But availability engineering has a hidden invoice: every mechanism that keeps the agent alive does it by substituting something for the fresh, primary, verified answer. That substitution is usually fine - which is exactly what makes it dangerous, because “usually fine” plus “irreversible” plus “silent” is how you get the 3am incident that no alert predicted.

Two gates. Tag what’s degraded. Taint what it touches. Check the trajectory, not the last call, before anything you can’t undo.

Uptime is table stakes. Correct uptime is the product.

### Sources & further reading

- [Detecting AI Agent Failure Modes in Production](https://latitude.so/blog/ai-agent-failure-detection-guide), Latitude (2026) - chained corruption as the most common and most insidious production failure mode.
- [AI Agent Error Handling: 5 Patterns to Catch Silent Failures](https://blog.jztan.com/ai-agent-error-handling-patterns/), Kevin Tan (2026) - the saga pattern, the 95%-confident migration story, and risk-based escalation.
- [AI Agent Failure Modes: What Goes Wrong in Production](https://www.trantorinc.com/blog/ai-agent-failure-modes-what-goes-wrong-design-resilience), Trantor (2026) - silent quality degradation from provider model updates and store drift.
- [International AI Safety Report 2026](https://arxiv.org/pdf/2602.21012) - why agent failures are categorically riskier: actions in the world, no human in the loop.
- [My previous post on the capacity side](https://dev.to/p0rt/your-ai-agent-isnt-failing-because-it-hallucinates-its-failing-because-of-rate-limits-2d60) - the availability toolkit this post is the second half of.

-----

*Credit where due: this post exists because ANP2 and Echo took the last one apart constructively in the comments - the “uptime, not correct uptime” framing and the latency-not-quality fallback distinction are theirs. Best argument I’ve had on this site. If you’re running agents in prod: do you track degraded-path exposure at all, or does your observability stop at error rates? Genuinely curious how rare Gate 2 is in the wild.*
