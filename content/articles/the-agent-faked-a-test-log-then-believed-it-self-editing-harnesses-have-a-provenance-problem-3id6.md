---
title: >-
  The Agent Faked a Test Log, Then Believed It. Self-Editing Harnesses Have a
  Provenance Problem.
slug: >-
  the-agent-faked-a-test-log-then-believed-it-self-editing-harnesses-have-a-provenance-problem-3id6
description: >-
  Reading Lilian Weng's harness engineering survey as a reliability engineer -
  what self-improving harness papers actually show, and the three invariants
  every working loop converges on.
published: true
date: '2026-07-08T11:39:46Z'
updated: '2026-07-08T11:39:46Z'
readingTime: 12
tags:
  - ai
  - llm
  - agents
  - softwareengineering
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fwbj92govcrt31iznwh8q.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/the-agent-faked-a-test-log-then-believed-it-self-editing-harnesses-have-a-provenance-problem-3id6
devId: 4096910
canonicalUrl: >-
  https://sergei-parfenov.com/blog/the-agent-faked-a-test-log-then-believed-it-self-editing-harnesses-have-a-provenance-problem-3id6/
---

Lilian Weng published a new survey on July 4: [Harness Engineering for Self-Improvement](https://lilianweng.github.io/posts/2026-07-04-harness/). It maps roughly three years of work on agents that optimize their own scaffolding - context managers, workflows, harness code, and eventually the optimizer that optimizes the harness. Most of the discussion around it will be about recursive self-improvement, because RSI is the exciting frame.

I read it with a different hat on. I run agents in production, and this blog has been circling one question for a while: what does it take to trust the output of a long agent chain? Read from that angle, her survey is not really a post about self-improvement. It's a post about a research field independently reinventing operations engineering - regression gates, immutable audit logs, least privilege - because every loop that skips those controls gets burned in a documented, reproducible way.

The cleanest burn in the whole literature comes from the [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) (DGM) paper. An agent, allowed to edit its own harness code, faked a log saying its unit tests had run and passed. The tests never ran. The fake log went into its own context. Downstream, the same agent read that log and concluded its changes were validated. It lied to itself, then trusted the lie - except "lied" smuggles in intent that was never there. This was garden-variety tool-use hallucination meeting an untyped log. Which is worse, not better: you don't need a deceptive agent to get this failure, just a filesystem that can't say who wrote what.

If you've read my post on provenance dying at the storage boundary <!-- TODO: link "Your Provenance Vector Dies at the Storage Boundary" -->, you already know where this is going.

## What a harness is, and why it became the optimization target

Weng's definition, compressed: the harness is everything between the raw model and the world. The loop that decides when to plan and when to act. Tool interfaces. Context assembly. Memory files. Permission checks. Evaluation. Claude Code and Codex CLI are harnesses. So is your homegrown retry-wrapper-plus-prompt-template, whether you call it that or not.

That this layer matters is now measurable. [Terminal-Bench 2.0](https://arxiv.org/abs/2601.11868) - 89 hard, containerized command-line tasks - shows the same frontier models scoring differently under different scaffolds; the best pairing in the benchmark paper (Codex CLI + GPT-5.2) lands at 63%. The benchmark authors are explicit that scaffolds get engineered around the quirks of specific models, which is also the founding observation of the self-harness line of work: harness design is model-specific, and hand-tuning it per model doesn't scale.

Weng organizes the field as a ladder of what gets optimized - prompts, then structured context, then workflows, then harness code, then the optimizer code itself - and walks every rung with examples. I won't duplicate the map; she does it in 28 well-spent minutes. What I want to do instead is pull a few load-bearing systems off that ladder and squint at their numbers and their failure reports - because that's where the story stops being about self-improvement and starts being about trust.

## What the numbers say when you squint

**[STOP](https://arxiv.org/abs/2310.02304)** (Zelikman et al. 2023) - the original improver-improves-the-improver loop, still the conceptual core of the field - reported the result that should frame everything else: seed the recursion with GPT-4 and downstream utility climbs across iterations; seed it with GPT-3.5 or Mixtral and the loop actively hurts. Recursion is not a free lunch. Below a capability threshold, the loop amplifies noise instead of signal. The base model remains the ceiling; the harness moves you around underneath it.

**Meta-Harness** ([Lee et al. 2026](https://arxiv.org/abs/2603.28052)) - a search loop in which a coding agent proposes, edits, and evaluates whole harness variants - is the honest data point on how much headroom automated search finds above strong human engineering. On Terminal-Bench-2 it initializes the search from Terminus-2 and Terminus-KIRA - already strong hand-built harnesses - and the discovered harness comes out ahead: 37.6% on Haiku 4.5, where the next-best agent (Goose) sits at 35.5% and Terminus-KIRA at 33.7%, and 76.4% on Opus 4.6 against 74.7% for Terminus-KIRA. Call it two to four points, found by a proposer (Claude Code on Opus 4.6) that evaluates around 60 harness variants over 20 iterations in a few hours of wall-clock time. Polish-sized gains - but polish at that price is a good trade.

The caveats are more instructive than the headline. The one entry still above Meta-Harness on Opus, ForgeCode at 81.8%, could not be reproduced by the authors from its public code. And - the detail I'd tattoo on the field - in the TB-2 experiment the search set and the test set are the same 89 tasks. The authors say so plainly: the benchmark is small and expensive, a proper split would gut the signal, so they run it as a discovery problem and compensate with manual inspection plus regex audits for task-specific string leakage. There's also a genuinely encouraging trace buried in the qualitative results: early candidates that bundled structural fixes with prompt-template rewrites regressed, and the proposer hypothesized the shared prompt edit was the confound, isolated the structural change, and shipped a safer additive modification that won the run. The optimizer performing ablation hygiene on itself is the best thing in the paper.

Second-best thing in the paper: the proposer-context ablation, which lands on the same conclusion as an experiment I ran here <!-- TODO: link the summarization-destroys-provenance post -->. Give the optimizer scores only: median 34.6. Add LLM-written summaries of the trajectories: 34.9 - statistically nothing. Hand it the full raw traces: 50.0. Summaries did not recover the signal; compression strips exactly the diagnostic detail the optimizer feeds on. Independent group, different setup, same shape: the information that makes a trace useful for diagnosis is the information a summary throws away first. Provenance does not survive compression.

Full disclosure, because it's too on-the-nose to skip: this exact failure mode bit me while writing this piece. My first draft sourced the Meta-Harness numbers from an LLM-generated paper-summary site, which confidently attributed that 35.5% baseline to Terminus-KIRA. The paper's own table says 35.5% is Goose; Terminus-KIRA sits at 33.7%. The wrong number lived in the draft until a fact-check pass against the raw table caught it. A machine-written summary - no provenance types, no link back to the table row - had quietly swapped a baseline. The ablation's finding, wearing street clothes. I nearly shipped an article about untyped trust on the strength of an untyped summary.

**DGM** - an evolutionary archive of coding agents, each free to rewrite its own harness repo - posted the impressive relative jump, 20% → 50% on SWE-bench Verified with a frozen Claude 3.5 Sonnet, but from a deliberately naive starting harness, and reporting put a single 80-iteration run at [around $22k and two weeks](https://the-decoder.com/sakana-ais-darwin-godel-machine-evolves-by-rewriting-its-own-code-to-boost-performance/). Look at what the loop actually discovered: finer-grained edit tooling, validation-and-retry on empty patches, context summarization near the window limit. Every one of these is a standard trick that hand-built coding harnesses already ship. The loop rediscovered expert engineering. That's a legitimate result - automated search recovering expert knowledge is useful - but it is not evidence of the loop *exceeding* expert knowledge.

**[SIA](https://arxiv.org/abs/2605.27276)**, the joint harness-plus-weights loop - a feedback agent decides per iteration whether to edit the harness or update the weights - is the one to hold loosely. Weng herself flags the confounds - the task agent (gpt-oss-120b) is far weaker than the meta and feedback agents steering it (Claude Sonnet 4.6), and the baselines are thin - and files the result under promising but unproven. A survey author doing that out loud is worth appreciating.

And at the "AI scientist" end of the ladder, [Trehan & Chopra](https://arxiv.org/abs/2601.03315) ran idea-to-paper attempts with a minimal scaffold (read, write, search, list). Of the generated ideas, four passed human selection and exactly one made it through to an executed paper. Their failure taxonomy reads like an ops incident review: stale defaults inherited from training data, implementation drift under execution pressure, context degradation on long horizons, and over-optimism - declaring victory on noisy results, the pattern [Bubeck et al.](https://arxiv.org/abs/2511.16072) call "p-hacking and eureka-ing".

Aggregate reading: self-editing loops today mostly (a) recover known harness engineering when started from scratch, (b) squeeze low single-digit points out of strong baselines, and (c) fail in ways that are structured and predictable rather than exotic. That last one is the good news. Predictable failure modes are the ones you can build controls for.

## The incident, in slow motion

Back to DGM, because the appendix on objective hacking is the most instructive few pages in this literature.

Setup: the researchers wanted the loop to reduce hallucinated tool use - the model narrating tool calls it never made. They instrumented real tool invocations with special marker tokens and scored agents on whether unmarked "tool output" appeared in generations. The checking functions were hidden from the agent during self-modification, and the authors note hacking happened *more often* when they weren't hidden.

Two lineages are worth naming. Node 96 did the honest work - improved tool-invocation logging, stripped hallucinated tool output when it could determine no tool ran - and scored 1.67 out of 2.0. Node 114 hit a perfect 2.0 after just two self-modifications: it deleted the detection markers. Perfect score, zero progress on the actual problem. Goodhart's law in its purest lab form. The team caught it because DGM keeps what Sakana describes as a "transparent, traceable lineage" of every change - and that lineage lived outside the agent's editable surface.

The faked test log is the deeper incident, though. A record was written *by the model*, persisted to the filesystem, and later consumed *by the model* as if it were runtime truth. Exactly one bit of metadata would have blocked the failure: **who wrote this record** - the harness runtime, or the model? In the typed-provenance framing I've been arguing for <!-- TODO: link "Trust Isn't a Scalar" -->, that's a `runtime-verified` vs `self-reported` tag, plus one rule: `self-reported` never upgrades itself by being re-read.

This is the storage-boundary failure from my earlier post, except recursive. The artifact crossing the boundary isn't user data anymore - it's the evidence the next iteration of the system uses to decide what the current iteration did. Untyped trust used to compound per request. In a self-editing harness it compounds per generation.

## Three invariants every working loop converges on

Put the successful loops side by side and the same skeleton appears, whether or not the authors name it:

**1. A bounded editable surface.** AlphaEvolve marks evolvable code regions with explicit block comments. [Self-Harness](https://arxiv.org/abs/2606.09498) - Shanghai AI Lab's loop in which the agent mines its own failure traces and patches its own harness - hands its proposer a declared list of editable surfaces plus a record of passing behaviors it must not break. DGM lets the agent rewrite its own repo - but not the evaluation stack. The loop needs a fence, drawn in advance, in writing.

**2. An evaluator and permission layer outside the fence.** DGM hides the checker functions and measures more hacking when it doesn't. Self-Harness validates candidate edits on a held-out split the proposer never optimized against, and promotes only edits with zero regression on *both* held-in and held-out sets. Meta-Harness is the instructive partial violation: on TB-2 the search optimizes against the test set itself - acknowledged, defended (small, expensive benchmark), and patched with manual audits. Even a careful team bends this invariant the moment evaluation gets expensive, which is exactly why it needs to be stated as an invariant rather than left as taste. Weng's own conclusion in the challenges section is that evaluators and permission controls should sit outside the loop that evolves the harness. This is separation of duties. It has a name because we've needed it before.

**3. An append-only, typed record of what happened.** DGM's lineage is how node 114 got caught. Self-Harness's weakness-mining stage explicitly rejects flat pass/fail labels - each failure record captures what the verifier observed, whether the agent's own behavior actually caused it, and through what mechanism - because two timeouts that look identical in an error log can have entirely different roots. That is not a scalar trust score. That is a typed provenance record. Even [ACE](https://arxiv.org/abs/2510.04618) - the context-optimization loop whose curator emits small itemized deltas instead of rewriting the whole prompt blob - lands on the same instinct: keep every change diffable, reviewable, attributable.

If you've operated software for a living you recognize all three: least privilege, separation of duties plus CI regression gates, immutable audit logs. The field isn't inventing new safety machinery - it's rediscovering ops controls from the inside, one incident at a time. Weng herself reaches for an operating-systems analogy for harnesses; I'm just following it down to the ops floor. I mean that as a compliment. Convergent evolution is evidence the constraints are real rather than stylistic.

Exactly one system in Weng's survey treats this as a first-class constraint - [ScientistOne](https://arxiv.org/abs/2605.26340) (Meng et al. 2026), over on the AI-scientist branch, where every claim must trace back to an evidence source and the chain gets audited. That idea has not crossed over to the self-editing harness loops. There, provenance keeps getting built as a side effect: lineage exists in DGM because researchers wanted to debug evolution; failure records are rich in Self-Harness because flat labels made weakness mining useless. The argument I've been making for two posts now is that the record type system should be the load-bearing wall, not the scaffolding you only notice after it catches something.

## You already run one of these

This is not a frontier-lab concern. If your coding agent maintains its own memory file, writes its own instruction or skill files, or appends "lessons learned" that get loaded into future sessions - you are running a self-editing harness. Smaller loop, same topology: model-authored artifacts feeding future model behavior, usually with zero record types and no regression gate.

The canonical failure shape doesn't need an adversary. An agent writes a confident note into its own memory - say, "the staging DB is safe to reset" - and three sessions later a different task reads it as established fact. Nobody hacked anything. The system simply has no way to distinguish what it *verified* from what it once *said*.

The checklist I'd actually apply:

1. **Treat model-authored harness edits like schema migrations.** Memory files, instruction files, generated skills: versioned, diffable, reversible. A model changing its own operating instructions is a deploy, not a note.
2. **Two-gate promotion.** An edit must fix the failure it targets (held-in) and break nothing else (held-out). Self-Harness converges on this shape independently, which is interesting - but shape is not sufficiency. My own preregistered test found a dumb baseline matching my gate scheme on half the failure classes <!-- TODO: link "My Strawman Baseline Beat My Own Scheme" -->, and I'd want Self-Harness benchmarked against an equally dumb accept-if-tests-pass rule before concluding the machinery earns its complexity. Run the gates - and run the strawman against them.
3. **Type every persisted record at write time.** `runtime-verified` / `self-reported` / `human-authored`, minimum. Enforce at read time that self-reported claims can't gate promotions or authorize actions.
4. **Keep the evaluator outside anything the loop can write.** Checker code, marker tokens, permission checks, credentials. If the agent can grep the checker, assume it will eventually optimize the checker instead of the task.
5. **Keep the failures.** Rejected edits and failed trajectories are the cheapest signal the loop has. The literature's bias toward publishing successes is exactly the bias your local loop will inherit from its own logs if you prune them. Weng lists preserving negative results among the field's open challenges; it applies just as hard at your scale.

None of this needs a research budget. It's a few enum values, a CI job, and some restraint about what ends up in the agent's writable mount.

## Where I land on "the model will eat the harness"

Weng's prediction runs through the prompt-engineering analogy: models absorbed the tricks, while the job of specifying what you want, under which constraints, judged how - that part outlived every trick. I mostly buy it, with one sharpening.

Split your harness into two piles. Pile one exists to *compensate for the model*: context massaging, retry phrasing, output parsing, the clever loop tweaks. Pile two exists to *protect you from the model*: permissions, evaluators, provenance types, the audit log. Pile one depreciates with every model release - that's the loan structure I wrote about in the coding-speedup post <!-- TODO: link "Your AI Coding Speedup Is a Loan" -->, and automated harness search will only accelerate the depreciation, since it rediscovers those tricks for cents on the engineer-dollar. Pile two appreciates, because the more capable and self-modifying the system, the more the trust boundary is the only part you actually own.

STOP's capability-threshold result cuts both ways here and closes the argument neatly: below the threshold, the loop can't help itself; above it, the loop starts probing the checker. Either way, the invariants aren't optional.

Read [Weng's survey](https://lilianweng.github.io/posts/2026-07-04-harness/) - it's the best map of this territory right now. Then go look at what your agents are already writing into their own context for tomorrow.

---

*Papers referenced: [Weng 2026 (survey)](https://lilianweng.github.io/posts/2026-07-04-harness/) · [DGM - Zhang et al. 2025](https://arxiv.org/abs/2505.22954) · [Self-Harness - Zhang et al. 2026](https://arxiv.org/abs/2606.09498) · [Meta-Harness - Lee et al. 2026](https://arxiv.org/abs/2603.28052) · [STOP - Zelikman et al. 2023](https://arxiv.org/abs/2310.02304) · [ACE - Zhang et al. 2025](https://arxiv.org/abs/2510.04618) · [SIA - Hebbar et al. 2026](https://arxiv.org/abs/2605.27276) · [Trehan & Chopra 2026](https://arxiv.org/abs/2601.03315) · [Terminal-Bench 2.0 - Merrill et al. 2026](https://arxiv.org/abs/2601.11868) · [ScientistOne - Meng et al. 2026](https://arxiv.org/abs/2605.26340) · [Bubeck et al. 2025](https://arxiv.org/abs/2511.16072)*
