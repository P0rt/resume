---
title: Your Provenance Vector Dies at the Storage Boundary
slug: your-provenance-vector-dies-at-the-storage-boundary-4cc
description: >-
  A typed provenance vector is useless if downstream code ignores it, and
  impossible if it can't survive being compressed to fit a 500-step agent's
  memory. Part 4: enforcement by construction, and compression that keeps the
  axes. The comment section keeps finding the holes.
published: true
date: '2026-07-01T11:58:09Z'
updated: '2026-07-01T11:58:09Z'
readingTime: 8
tags:
  - ai
  - llm
  - devops
  - machinelearning
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2F3kbx9dss0b5tuznipri7.png
source: dev
sourceUrl: 'https://dev.to/p0rt/your-provenance-vector-dies-at-the-storage-boundary-4cc'
devId: 4041177
canonicalUrl: >-
  https://sergei-parfenov.com/blog/your-provenance-vector-dies-at-the-storage-boundary-4cc/
---

Last post I argued that agent trust should be a [typed provenance vector](https://dev.to/p0rt/trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p): carry what-degraded-and-how alongside each result, propagate it, let each consumer apply its own policy. The comments agreed on the model and then immediately found the two places it breaks in the real world. Both are load-bearing, both were things I hand-waved, and this post is about them.

- **mote** asked what happens when the agent runs 500 steps and the vector no longer fits in the context window.
- **Mykola** said the quiet part louder: *"you can build a perfect trust lattice but most agents just act on output without checking provenance. The hard part is enforcement, not the model."*

Both are right, and together they name the two ways a provenance vector dies in production: nobody reads it, or it can't survive being stored. One problem is about *enforcement*, the other about *persistence*.

> **TL;DR** - Two failure modes kill a provenance vector in production. **Enforcement:** if acting on a value doesn't *require* passing through the gate, developers (and models writing tool calls) will skip it - so make the unsafe path unrepresentable via types, not discipline. **Persistence:** on long-horizon agents the vector must survive compression to fit bounded memory, and naive summarization washes out exactly the axes you need - so compress structurally (per-axis, lossless scores + lossy lineage), not as prose.

## Problem 1: enforcement, or the vector nobody reads

Mykola's point is the one that should scare you, because it's true of almost every "add metadata to make it safer" scheme: the metadata is optional, so under deadline it gets skipped. You can ship a beautiful `Provenance` type and six months later find that the payment path reads `result.value` and never touches `result.provenance`. The lattice was perfect. Nobody consulted it.

The fix is not "remember to check." Discipline doesn't scale and it definitely doesn't survive a model writing its own tool calls. The fix is to make *acting without checking* something the code physically cannot express.

This is a solved problem in a neighboring field, and it's worth stealing wholesale. Capability-based security has done this for decades: authority is an **unforgeable token you must hold a reference to** - you can't perform the action without possessing the capability, and possession is the check. Recent work brings this into static types explicitly: track the capability in the type system, and the *absence* of it in a function's type guarantees, at compile time, that the function can't perform the guarded action. The safety isn't a runtime assertion you might forget - it's a property of what typechecks.

Applied to provenance, the move is: **the irreversible action can't accept a raw value, only a gated one.**

```python
from typing import Generic, TypeVar, NoReturn
T = TypeVar("T")

class Provenanced(Generic[T]):
    """A value you cannot use for a side effect without unwrapping -
    and the ONLY unwrap path runs the gate."""
    def __init__(self, value: T, prov: Provenance):
        self._value = value
        self._prov = prov

    def unwrap_for(self, action: "Policy") -> T:
        decision = gate(action, self._prov)
        if decision != "proceed":
            raise ProvenanceViolation(decision, self._prov)  # refetch / escalate / ...
        return self._value

# the side-effecting function's SIGNATURE refuses raw values:
def charge_card(amount: Provenanced[Money], policy: Policy) -> Receipt:
    money = amount.unwrap_for(policy)   # the only way to get the Money out
    ...
```

Now "charge the card without checking provenance" doesn't fail code review - it doesn't typecheck. There is no path from a raw `Money` to `charge_card`, because the signature demands `Provenanced[Money]`, and the only way to extract the value runs the gate. You've moved the enforcement from the developer's memory into the type system. It's the same trick as idempotency keys from two posts ago: don't ask people to remember the safe thing, make the unsafe thing unrepresentable.

**The honest limit** (which a commenter will rightly raise, so I'll raise it first): this holds at the *framework boundary*, in typed code you control. The moment your agent writes free-form tool calls - the model generating Python that calls your API directly - it can simply not use the wrapper, and you're back to enforcement-by-hope. For that case the type system can't reach, so enforcement has to drop to the infrastructure layer: the side-effecting tools sit behind a proxy that refuses any call whose payload doesn't carry valid provenance. You lose compile-time guarantees and get runtime rejection instead - worse, but still "structurally can't skip it" rather than "please remember." The principle survives even when the mechanism changes: enforcement lives in something the actor can't route around, never in something it's asked to honor.

## Problem 2: provenance that survives compression

mote's problem is deeper and I didn't have an answer in the thread, so I went and found one. Here's the setup: a long-horizon agent - mote's case is literally robots on edge hardware with a hard context ceiling - can't hold a growing provenance graph in working memory across 500 steps. It has to compress. And the standard compression move, summarize-history-into-prose, is catastrophic for provenance specifically, because summarization is *lossy in an uncontrolled way* - it'll happily drop "step 47 ran on a stale cache" to save tokens, and that's the one fact a downstream gate needed.

This isn't hypothetical. The field now attributes the majority of enterprise agent failures to context drift and memory loss during multi-step reasoning - not to hitting the context limit, but to the *quality degradation on the way there*. And there's a subtler trap the RL-agent researchers named: compression credit is causally entangled - the same downstream failure needs opposite explanations depending on whether the bad state came from a tool or from memory. If your compression flattens that distinction, you can't even diagnose what broke.

So the naive answer - "summarize the provenance too" - reintroduces the exact scalar-collapse problem from the last post, now smuggled in through the storage layer. A summary is an average wearing a trench coat.

The better answer comes from a simple observation: **the axes have different compression economics, so don't compress them uniformly.**

- **Scores compress to almost nothing, losslessly.** A per-axis float - `freshness: 0.2, capability: 0.6` - is a handful of numbers. Even across 500 steps, if you keep only the *running minimum per axis* (which is what the gate reads anyway; recall the `min` from last post), that's constant size regardless of history length. You never need to compress the scores, because `min`-reduction already bounds them.
- **Lineage is what explodes, and lineage is what you can afford to lose.** The `tainted_by` sets - *which exact steps* degraded each axis - grow with the trajectory. But for the *gate decision*, you usually don't need the full ancestry; you need "is any unverified degraded step still on the live path." So this is the part you lossy-compress: keep the axis scores whole, summarize the lineage behind a pointer, and accept that you lose "which exact step" while keeping "how degraded, per axis."

This maps onto where the research is heading. The most promising long-horizon approaches have stopped treating the trajectory as prose to be summarized and started treating it as a **typed dependency graph the agent annotates as it works**, with a deterministic eviction policy that walks the graph when the token budget blows - explicitly to avoid the four pathologies of prose compaction: unpredictable lossiness, structural destruction, blocking cost, and compression-induced hallucination. A typed provenance vector *is* that annotation. The eviction policy for provenance is: evict lineage detail, never evict axis scores.

There's one more axis this forces you to add, and it's almost funny: **compression is itself a degradation source.** A vector reconstructed from a lossy summary is less trustworthy than one carried whole - so "this provenance was reconstructed across a storage boundary" is a real provenance fact that deserves its own axis. `reconstruction: 0.8` means "these scores survived a compaction; treat the lineage as approximate." The provenance system has to describe its own lossiness. Turtles, but only two deep.

## Why this keeps being a security problem in disguise

Every post in this series has ended up borrowing from security, and this one makes the reason explicit. Traditional taint tracking assumes deterministic program states and exact data-flow: memory locations, registers, string matches. LLM agents break all of that - untrusted content gets *rewritten, summarized, and used to choose later actions*, so "did this bad input reach that sink" is a question about semantic and causal influence, not byte-level flow. The agent security researchers building taint trackers for exactly this case had to redefine propagation to include semantic transformation and cross-session persistence through memory - which is the same two problems this post is about (enforcement and persistence), arrived at from the attack side instead of the reliability side.

That convergence is the tell. When the reliability people and the security people independently reinvent the same structure - unforgeable gating plus provenance that survives memory - it's because it's the actual shape of the problem, not a preference.

## Where the series stands

Four posts, one arc:

1. **Availability** - agents fail on capacity (rate limits), not reasoning.
2. **Correctness** - the capacity fixes buy uptime by acting on unearned output; you need *correct* uptime.
3. **The model** - trust isn't a scalar; it's a typed provenance vector with policy at the consumer.
4. **The reality** (this one) - that vector only works if it's *unskippable* (enforcement by type/proxy) and *survivable* (structural compression, not prose).

The through-line, one more time: agent reliability is a provenance problem, and provenance is a solved discipline - capability security, data lineage, taint analysis - that we're re-deriving because the untraceable thing now acts, and acts through a bounded, forgetful, non-deterministic memory. The novelty isn't the primitives. It's that they now have to hold under compression and under a model that can route around anything you merely *ask* it to respect.

If you're building this: gate at a boundary the actor can't skip (type or proxy), compress scores losslessly and lineage lossily, and add a `reconstruction` axis the day your provenance crosses a storage line. Start there.

---

*Credit, again, to the comment section that wrote the spec: **mote** (compression across the storage boundary, the edge/bounded-context framing that motivates the whole second half), **Mykola Kondratiuk** (enforcement is the hard part, not the model), plus **Tae Kim**, **Nazar Boyko**, **Ken**, and **Ahmet Özel** for sharpening the axis rules in the last thread. Open question for this one: has anyone actually run provenance across a compaction boundary in production and measured what the gate decisions do on the reconstructed vector versus the original? That's the experiment I don't have data for yet - and it's the one that decides whether any of this holds.*

### Sources & further reading

- ["Tracking Capabilities for Safer Agents"](https://arxiv.org/pdf/2603.00991) - capabilities as unforgeable tokens tracked in static types; compile-time non-interference from the absence of a capability.
- ["Ghost in the Agent: Redefining Information Flow Tracking for LLM Agents" (NeuroTaint)](https://arxiv.org/pdf/2604.23374) - why classical taint doesn't transfer: agents rewrite, summarize, and act on untrusted content; taint as semantic/causal/persistent influence.
- ["Beyond Compaction: Structured Context Eviction for Long-Horizon Agents"](https://arxiv.org/pdf/2606.11213) - annotate the trajectory as a typed dependency graph; deterministic graph-walking eviction instead of prose summarization.
- ["AI Agent Context Compression: Strategies for Long-Running Sessions"](https://zylos.ai/research/2026-02-28-ai-agent-context-compression-strategies/) - context drift/memory loss as the majority of enterprise agent failures; anchored iterative summarization beats full reconstruction.
- ["HiMPO: Hindsight-Informed Memory Policy Optimization"](https://arxiv.org/pdf/2606.16285) - causally entangled memory credit: the same failure needs opposite explanations depending on tool-vs-memory origin.
- The series: [Part 1 - capacity](https://dev.to/p0rt/your-ai-agent-isnt-failing-because-it-hallucinates-its-failing-because-of-rate-limits-2d60) · [Part 2 - correct uptime](https://dev.to/p0rt/you-fixed-the-rate-limits-now-your-agent-fails-quietly-3keo) · [Part 3 - typed provenance](https://dev.to/p0rt/trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p)
