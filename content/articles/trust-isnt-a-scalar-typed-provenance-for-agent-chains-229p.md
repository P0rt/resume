---
title: 'Trust Isn''t a Scalar: Typed Provenance for Agent Chains'
slug: trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p
description: >-
  Two posts ago I gave you a boolean trust tag. A commenter took it apart, and
  he was right. Here's the better model: trust is a vector over axes, provenance
  is what propagates, and the consumer applies the policy. Part 3 of a series
  that my comment section is co-writing.
published: true
date: '2026-06-22T14:21:08Z'
updated: '2026-06-22T14:21:08Z'
readingTime: 9
tags:
  - ai
  - llm
  - devops
  - machinelearning
language: en
coverImage: ''
source: dev
sourceUrl: 'https://dev.to/p0rt/trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p'
devId: 3963309
canonicalUrl: >-
  https://sergei-parfenov.com/blog/trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p/
---

Two posts ago, in [the one about agents failing quietly](https://dev.to/p0rt/you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo), I handed you a fix for silent degradation: tag a degraded output `trust="degraded"`, propagate the taint down the chain, and gate irreversible actions on it. Clean, shippable, and - as a commenter named Theo pointed out within a day - **wrong in a way that matters.**

The tag was a boolean. And trust isn't a boolean. It isn't even a scalar.

This post is me being wrong in public and fixing it, because the corrected model is genuinely better and most of it was built by people in that comment thread. Credits at the end; they earned them.

> **TL;DR** - A single trust score (`full`/`degraded`, or `0.0-1.0`) collapses on real chains, because degradation happens along *different axes* - a stale cache lowers *freshness*, a weaker fallback lowers *capability* - and different downstream steps care about different ones. Collapse them to one number and you either over-reject (every degradation is fatal) or under-reject (the dangerous one gets averaged away). What actually composes is **typed provenance**: carry a vector of what-was-degraded-and-how alongside the result, propagate it across the chain, and let each consumer apply its own policy at the moment it's about to act.

## Why a scalar collapses

Here's the case that broke my boolean, almost verbatim from Theo's comment.

You have two downstream steps, both consuming an upstream result:

- A **summarization** step. It tolerates a weaker model just fine, but it must not run on stale data.
- A **price calculation**. It's the reverse: it needs current data, but a slightly weaker model doing arithmetic is fine.

Now the upstream result came from a fallback model reading a 2-hour-old cache. So it's degraded on *both* a capability axis (weaker model) and a freshness axis (old cache). What's your single trust score?

- If you set it **low** (treat any degradation as serious), the summarization step over-rejects - it would've been totally fine with the weaker model, but your scalar said "degraded" so it bails or escalates needlessly.
- If you set it **high** (it's "mostly fine"), the price calc under-rejects - it acts on stale data because the scalar averaged the freshness problem into a number that looked acceptable.

There is no single threshold that's simultaneously right for both consumers, because they're not measuring the same thing. A scalar forces every consumer to share one definition of "trustworthy," and they don't have one. As Theo put it: collapse the vector to one number and you destroy exactly the information the consumer needs to make its own decision.

This isn't just my comment section talking, either - it's where the field is converging. A recent framework (TrustBench) makes the same move explicitly: rather than reduce trust to a single scalar, keep dimensional scores per trust aspect, and weight them per domain - healthcare prioritizing citation validity and recency, finance prioritizing calculation and compliance. Same shape, arrived at independently. When several people reach for the same structure from different directions, it's usually because the structure is real.

## Trust is a vector; provenance is what you propagate

Here's the reframe that fixes it, and it starts with a vocabulary correction I owe you: I kept calling the thing "trust." That was the bug in the language, not just the code.

**Trust is not a property of a value. It's a judgment a consumer makes about a value.** What the value actually *carries* is **provenance** - the typed record of how it came to be: which model produced it, how fresh its inputs were, which tools ran, what got degraded and along which axis. Trust is what each consumer *computes from* that provenance, under its own policy. The price calc and the summarizer look at the same provenance and reach different verdicts, and that's correct, not contradictory.

So you don't propagate a degraded flag. You propagate a **typed vector**, and each axis degrades independently:

```python
from dataclasses import dataclass, field
from enum import Enum

class Axis(str, Enum):
    FRESHNESS = "freshness"      # how current were the inputs
    CAPABILITY = "capability"    # how strong was the model that produced this
    TOOL = "tool"                # did the tool calls actually succeed
    VERIFICATION = "verification" # was this checked against ground truth

@dataclass
class Provenance:
    # per-axis score in [0,1]; 1.0 = fully trusted on that axis
    axes: dict[Axis, float] = field(default_factory=lambda: {a: 1.0 for a in Axis})
    # which upstream step_ids contributed degradation, per axis
    tainted_by: dict[Axis, set[str]] = field(default_factory=lambda: {a: set() for a in Axis})

    def merge(self, *upstreams: "Provenance") -> "Provenance":
        out = Provenance()
        for axis in Axis:
            # an output is only as fresh as its stalest input, only as
            # capable as its weakest producer - min, not average. averaging
            # is exactly how the dangerous axis gets washed out.
            out.axes[axis] = min([self.axes[axis]] + [u.axes[axis] for u in upstreams])
            out.tainted_by[axis] = set(self.tainted_by[axis])
            for u in upstreams:
                out.tainted_by[axis] |= u.tainted_by[axis]
        return out
```

The `min` is doing real work there. The whole failure of my original taint-as-boolean was that it answered "is anything degraded?" - a single OR across the chain. The vector answers "*what kind* of degradation is this output carrying, and how much, per axis?" - and crucially, it takes the **minimum per axis** rather than averaging, because averaging is the mathematical operation that makes a serious freshness problem disappear behind three fine capability scores.

## The gate is per-consumer, not global

Now the irreversibility gate from the last post stops being one global threshold and becomes a policy that lives *at each consumer*:

```python
@dataclass
class Policy:
    # per-axis minimum this consumer requires to act without re-check
    floors: dict[Axis, float]

    def admits(self, p: Provenance) -> bool:
        return all(p.axes[a] >= floor for a, floor in self.floors.items())

# the summarizer doesn't care about capability, but demands freshness
SUMMARIZE = Policy(floors={Axis.FRESHNESS: 0.9, Axis.CAPABILITY: 0.3})

# the price calc is the mirror image
PRICE_CALC = Policy(floors={Axis.FRESHNESS: 0.95, Axis.CAPABILITY: 0.6,
                            Axis.VERIFICATION: 0.8})

def gate(action_policy: Policy, p: Provenance):
    if action_policy.admits(p):
        return "proceed"
    # which axis failed tells you HOW to recover, not just THAT to stop
    failed = [a for a, f in action_policy.floors.items() if p.axes[a] < f]
    if Axis.FRESHNESS in failed:
        return "refetch"      # re-run the stale step on live data
    if Axis.CAPABILITY in failed:
        return "re-run-on-primary"
    return "escalate-to-human"
```

This is the payoff. The same upstream provenance vector flows to both consumers, and they reach *different, individually correct* decisions from it. The summarizer proceeds; the price calc refetches. One global score could never do that - and the failed-axis tells you *how* to recover, which a boolean never could.

Notice this also absorbs a point another commenter (Manuel) made independently: he argued the tag should be an enum, not a bool - `skipped-tool` vs `stale-data` vs `retry-budget-exhausted` route differently. He was right, and the vector is the generalization: an enum is a vector with one axis active; the full structure lets multiple axes degrade at once, which is the real production case.

## "Gate on risk, not confidence" - and confidence is just one axis

The last post argued you should gate on *irreversibility*, not on the model's self-reported confidence. The vector makes that precise instead of hand-wavy: **confidence is one axis among several, and it's the one the model grades itself on.** A model can be 95%-confident (high on a confidence axis) while sitting on a freshness score of 0.2 because it reasoned over a stale cache. The skill-conditional-trust literature makes the same argument from the routing side - a single global score is the wrong object because it can't express "great at this, useless at that." Confidence-as-the-only-axis is how you get the war story everyone has: the agent that was sure, and sure on the wrong thing.

## How many axes before it stops being worth it?

This is the honest open question, and the one I asked Theo back. A vector with 40 axes is just a scalar's opposite failure - unwieldy, untunable, theater of rigor. My current answer, and I'd genuinely take pushback: **start with the axes that map to your actual degradation sources, and no more.** If your system has exactly two ways to degrade - fallback model and stale cache - you have two axes (capability, freshness). Add `verification` the moment you have a re-check step whose result you want to carry. Add `tool` when a tool can half-succeed. The axis count should equal the number of *distinct things that can independently go wrong*, not the number of things you can imagine going wrong. If two "axes" always move together, they're one axis.

The sweet spot, I think, is the smallest set where each axis maps to a different *recovery action*. Freshness → refetch. Capability → re-run on primary. Verification → escalate. If two axes would trigger the same recovery, collapse them. The vector earns its complexity only where it changes what you *do*.

## The practical layer (mostly stolen from the comments)

The vector is the core idea, but the thread surfaced a full toolkit around it, and it'd be dishonest to present any of it as mine:

- **Admission control, upstream of everything** (Dan): before the agent fans out, decide if the whole task can afford to run, and separate the four limits that 429s blur together - provider quota (physics), account quota (policy), task budget (this run), ledger (forensics). The ledger turns out to be the same record as provenance: "this run cost 47 calls, 12 on the fallback tier" is both your bill and your capability-axis score.
- **Validation at consumption, not production** (James): don't validate on the fresh-call path and trust the cache; validate when a value is *used*, regardless of where it came from. That closes the laundering loophole at the consumer - which is exactly where the per-consumer gate already lives.
- **Time-bound by causality, not wall-clock** (HARD IN SOFT OUT): I was tempted by "reset taint after N seconds." Don't - degraded state can sleep and surface later. Clear an axis when nothing on the live path still derives from the degraded step, not when a timer expires.
- **The poor-man's version for solo builders** (TuanAnhNguyen): no observability stack? Have any tool that acts on a stale-readable input append one line to a log, and `grep` it before anything irreversible. It's the 5%-effort version of the provenance vector - a breadcrumb instead of a graph - and below a certain scale it's the *correct* amount of engineering.
- **The distributed correction** (Abdullah): my original concurrency cap was an in-process semaphore, which silently assumes one process. Under serverless fan-out, N containers each capping at 8 gives you 8N real concurrency. The limiter has to live outside the workers. (Also: TPM saturates before RPM on long-context agents, and "fallback to a cheaper model" is fiction if it draws from the same pooled tier. Both are capability/freshness axis sources you'd otherwise miss.)

## The parable that says it better than I did

A commenter (HARD IN SOFT OUT) left this, and it's the whole series in five lines:

> The agent hit a rate limit. It fell back to a cached answer from last Tuesday. The world changed on Wednesday. The agent kept working. The logs said "cache hit, 200 OK." The user got a message: "Your order has shipped." The warehouse's API key expired on Thursday.

Every hop green. Every log a 200. And a real package never ships. A scalar trust score on that final "order shipped" output would read *fine* - the last call succeeded. A provenance vector reads `freshness: 0.1, tainted_by: {warehouse_check}` and the shipping gate refuses to fire. That's the entire difference between uptime and correct uptime, and between a boolean and a vector.

## Where this leaves the series

Three posts in, the actual thesis has assembled itself: **agent reliability is a provenance problem.** Availability (post 1) is the easy axis. Correctness (post 2) is the one that bites. And the structure that makes correctness tractable (post 3) is typed provenance carried through the chain, with policy at the edges. None of that is exotic - it's data lineage, taint analysis, and saga patterns, borrowed from disciplines that solved their version decades ago, newly load-bearing because the untraceable thing now *acts*.

If you're building this: start with two axes and a `min`, put the policy at the consumer, and add an axis only when it changes a recovery action. Everything else is premature.

---

*This post was largely written by the comments on the last one. Credit, specifically: **Theo Valmis** (trust-is-a-vector, the summarize-vs-price-calc case, "typed provenance"), **Manuel Bruña** (enum-not-bool), **Dan** (admission control, the four-limit split), **James O'Connor** (validation at consumption), **HARD IN SOFT OUT** (causality-bound taint, the parable), **TuanAnhNguyen** (the solo-builder grep version), **Abdullah Shahin** (the distributed-limiter and pooled-fallback corrections), and **Scarab Systems** (the "evidence gate" framing that started me thinking about provenance as an obligation, not metadata). Best comment section on this site. Question for the thread: how many axes does your system actually need - and which ones map to a distinct recovery action versus just feeling rigorous?*

### Sources & further reading

- ["Real-Time Trust Verification for Safe Agentic Actions" (TrustBench)](https://arxiv.org/pdf/2603.09157) - dimensional trust scores over a scalar, domain-weighted, with block/warn/proceed gating.
- ["When Should Agent Trust Be Conditional?"](https://arxiv.org/html/2606.14200) - why a single global trust score is the wrong object for skill-heterogeneous agents.
- ["From Agent Traces to Trust: A Survey of Evidence Tracing and Execution Provenance in LLM Agents"](https://arxiv.org/html/2606.04990) - persistent lineage across memory writes, retrievals, and reuse.
- ["Redefining AI Agent Trust: An Input/Output-First Approach"](https://www.montecarlodata.com/blog-redefining-agent-trust-input-output), Monte Carlo - trust as enforced contracts at system boundaries (freshness, schema, lineage on input; traceability on output).
- [Part 1 - the capacity side](https://dev.to/p0rt/your-ai-agent-isnt-failing-because-it-hallucinates-its-failing-because-of-rate-limits-2d60) and [Part 2 - correct uptime](https://dev.to/p0rt/you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo).
