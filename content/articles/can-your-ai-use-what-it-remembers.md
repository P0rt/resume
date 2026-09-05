---
title: Can Your AI Use What It Remembers?
slug: can-your-ai-use-what-it-remembers
description: >-
  An AI can recall a fact when asked and miss it when it matters. InMind
  separates retrieval from application—and suggests a better way to test agent
  memory.
published: true
date: '2026-09-05T14:03:11.160Z'
updated: '2026-09-05T14:03:11.160Z'
tags:
  - ai
  - agents
  - memory
  - evaluation
language: en
coverImage: 'https://sergei-parfenov.com/assets/can-your-ai-use-what-it-remembers.png'
source: local
sourceUrl: ''
canonicalUrl: 'https://sergei-parfenov.com/blog/can-your-ai-use-what-it-remembers/'
coverAlt: >-
  An anime courier tries the wrong key in a star-shaped lock while the matching
  key sits among the memories in her transparent backpack.
---
An assistant correctly recalls a user's tree-nut allergy. Given a request for macarons, it supplies an almond-flour recipe without applying that allergy to the user.

This is a recorded example from [InMind, a July 2026 study of agent memory](https://arxiv.org/html/2607.24368v1#S12), using xMemory. The evaluations ask two different things: can the system retrieve a fact when the question names it, and can it bring that fact into a decision that needs it?

The second question is the reason to give an assistant memory in the first place. A user should not need to know which past conversation to reference before every request.

For a coding agent, the equivalent might be remembering that a service runs in short-lived processes, then proposing an in-process timer for hourly cleanup. That is an illustrative test case, not a result reported in the paper. It has the same useful structure: the current request does not repeat the architectural constraint, but the constraint changes what a correct solution looks like.

InMind makes that distinction measurable. Its 125 synthetic tasks pair a stored personal fact with a later request whose relevance depends on background knowledge. The authors deliberately remove obvious lexical and semantic retrieval cues. This is a stress test for a particular failure mode, not a sample of everyday assistant traffic.

For the study's A-Mem configuration with text-embedding-3-large, [Table 1](https://arxiv.org/html/2607.24368v1#S4.T1) reports:

- **100% direct recall:** a passing score on all 125 questions that directly ask for the stored fact.
- **12% target recall:** the necessary fact is judged present in the model's context for 15 of the 125 indirect requests.
- **9.6% application:** the combined memory-and-answer evaluation passes 12 of those 125 requests.

These are separate measurements. The [released evaluation protocol](https://github.com/imlrz/InMind/blob/5a2ab2686d3d5b832575f0288d41ecc93eab358b/evaluation/README.md#standard-protocol) calls for direct questions and indirect requests to use the same frozen memory state, without letting the first answer supply a hint for the second.

The application number needs care. Its rubric requires both the personal fact in context and a relevant warning or reminder in the answer. When the authors score only the answer, the same A-Mem configuration reaches **25.6%**, not 9.6%. A model can produce a useful caution from general knowledge without retrieving anything about this particular user. That answer may be good; it is not evidence that the memory system worked. The paper's [answer-only evaluation](https://arxiv.org/html/2607.24368v1#S14.SS1) and [human audit](https://arxiv.org/html/2607.24368v1#S14.SS2) expose exactly this ambiguity.

The cleanest signal here is the missing fact: direct questions find it, while indirect requests usually do not deliver it to the answerer.

The [A-Mem setup](https://arxiv.org/html/2607.24368v1#S15.SS7) appends a raw target note to a prebuilt, read-only bank. This tests selection when the fact is available; it does not establish survival through weeks of memory rewriting.

In a retrieve-then-answer pipeline, the order is:

```text
new request
    → choose memories
    → put selected memories in context
    → generate a response
```

The selection step must decide what matters before the answerer sees the candidate facts together with the request. If selection misses a constraint, the answerer may produce a perfectly reasonable solution for a different environment.

This does not mean embeddings cannot encode useful associations, or that an agent cannot discover them through additional searches. It means those capabilities need testing on requests that do not already identify the required memory. Bigger retrieval scores on direct questions do not settle that question.

Related work already reaches beyond factual recall. [LoCoMo-Plus](https://arxiv.org/abs/2602.10715) examines whether agents retain and apply implicit conversational constraints. InMind's useful contribution here is its paired diagnosis of stored facts whose relevance requires an unstated knowledge connection. It is not the discovery that memory should affect behavior.

For a project assistant, I would turn that diagnosis into a small set of regression cases. Start with a requirement whose effect can be checked:

```text
Stored constraint:
Processes can terminate at any time. Recurring jobs must
continue running even when no web request is active.

Direct question:
What execution constraints does this service have?

Indirect task:
Implement hourly cleanup of expired exports.

Behavior to check:
Does the proposed solution keep recurring execution outside
the lifetime of a single web process?
```

Use independent copies of the same starting state. One receives the direct question. Another receives only the task. A third receives the task with the relevant constraint explicitly included. Keep unrelated context and budgets matched where possible; the explicit-fact condition is an intervention, not an ordinary retrieval result.

Record the context the model actually received. That gives a failure somewhere to belong:

- If the fact is absent from storage, investigate capture or updates.
- If it exists but does not reach the answerer, investigate selection and context assembly.
- If it reaches the answerer but the implementation violates it, investigate application.

Score the implementation separately from memory delivery. A model might choose a durable scheduler without knowing the project's constraint. That can pass the functional test while telling us little about retrieval. Conversely, mentioning the constraint in an explanation should earn no credit if the generated code still relies on a process-local timer.

The test also needs requests where the constraint should have no effect. A button-label change should not become a lecture about background workers. And it needs a later instruction that legitimately changes the requirement: if recurring execution is explicitly removed from scope, the old rule should not silently override the new task.

Without those controls, a system that recites every restriction on every turn can look surprisingly competent. InMind itself notes that its rubric does not penalize excessive warnings. That makes it useful for finding missed associations, but insufficient for deciding whether an assistant applies memory appropriately across ordinary work.

The [accompanying probe](https://sergei-parfenov.com/downloads/agent-memory-probe.zip) contains 12 developer-constraint fixtures and isolated inputs for these conditions. A local BM25 run, returning at most three records, delivered the target fact for **12 of 12 direct questions and 4 of 12 indirect tasks**. The cases were deliberately written with vocabulary mismatches. This is a transparent illustration of lexical retrieval, not a measurement of a modern agent's memory quality.

No LLM was run in that probe. Whether a generated implementation follows the constraint remains a separate evaluation. The inputs and behavioral rubrics are included so those checks can be run against an actual agent. InMind's public release also still lacks baseline adapters and paper-aligned per-task results, so the published model scores above are reported findings, not a replication performed for this article.

Keeping selected constraints visible in every task is one option to test. The engineering problem then moves to which constraints deserve that space, which project or environment they apply to, and when they expire. A remembered fact can be correct and still be irrelevant to the current branch, obsolete after a migration, or superseded by an explicit instruction.

For an initial implementation, I would keep a small set of active project requirements with an explicit scope, while leaving detailed history searchable. Then I would test both omissions and unnecessary enforcement. That is a design proposal, not a fix established by the paper.

The benchmark is small and deliberately difficult; GPT-5-mini serves as both answerer and judge, and the human audit found scoring errors. Its numbers do not establish how often a particular production agent will fail. They do establish a question that a direct-recall demo cannot answer.

Ask the agent what it remembers. Then, from a fresh copy of the same state, ask it to do something that depends on that memory. Check what reached the model, check what it built, and check when the remembered rule should stop applying.

The useful promise of memory is that you can stop repeating yourself.

That is the promise the test should measure.

---

Sources: Ruizhe Li, Mingxuan Du, Benfeng Xu, and Zhendong Mao, [Keep It InMind, v1, July 27, 2026](https://arxiv.org/html/2607.24368v1) (CC BY 4.0); [InMind repository](https://github.com/imlrz/InMind); Yifei Li et al., [LoCoMo-Plus, February 11, 2026](https://arxiv.org/abs/2602.10715).
