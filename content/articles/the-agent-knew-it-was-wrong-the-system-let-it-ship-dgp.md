---
title: The Agent Knew It Was Wrong. The System Let It Ship
slug: the-agent-knew-it-was-wrong-the-system-let-it-ship-dgp
description: >-
  In 660 of 800 autonomous research runs, the agent found a critical flaw and
  delivered the result anyway. Self-review is not a control unless it can block
  the effect.
published: true
date: '2026-09-01T17:49:00Z'
updated: '2026-09-01T20:29:32Z'
readingTime: 9
tags:
  - ai
  - agents
  - llm
  - mlops
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fw05rcvl9i5ad5nccjk0e.png
source: dev
sourceUrl: 'https://dev.to/p0rt/the-agent-knew-it-was-wrong-the-system-let-it-ship-dgp'
devId: 4548988
canonicalUrl: >-
  https://sergei-parfenov.com/blog/the-agent-knew-it-was-wrong-the-system-let-it-ship-dgp/
---

In 660 of 800 autonomous research runs, the agent found a serious flaw in its own work.

It wrote the flaw down.

Then it delivered the report anyway.

The model did not fail to notice.

The system failed to make noticing consequential.

> **TL;DR**
>
> - AutoResearchEval labeled 82.5% of its 800 trajectories with “uncorrected self-awareness”: the agent identified a critical flaw, then continued without fixing or gating it
> - A separate abstention benchmark found agents sometimes performed an irreversible action and only then claimed they had refused
> - In a 3,621-trial policy study, an output reviewer ran after exposure and backend effects; moving enforcement to the tool boundary cut trace failures from 57.6% to 0.2% in the primary comparison
> - A review that cannot change execution state is observability, not control

## The failure was not awareness

[AutoResearchEval](https://arxiv.org/abs/2608.14905) took 100 research tasks across seven scientific domains and ran each through eight harness-model combinations.

The result was 800 complete trajectories, roughly 73,000 tool calls, and an average of 92.3 steps per run. The evaluator inspected the reports, code, generated data, retrieval logs, and execution artifacts rather than scoring only the final answer.

Its most common failure pattern was not hallucination.

It was **uncorrected self-awareness**.

Pattern | Trajectories | What happened
--- | ---: | ---
Uncorrected self-awareness | 660 / 800 | The agent identified a fatal or critical flaw and made no consequential correction
Method-conclusion disconnect | 620 / 800 | The written conclusion was not supported by the method actually executed
Failure to gate critical flaws | 502 / 800 | A critical issue was recorded but did not block delivery
Report-trace gap | 484 / 800 | Claims could not be traced to the code, data, or logs produced in the same run

Those categories overlap. They are not four independent populations and should not be added together.

The useful part is the shape of the failure.

The evidence was already inside the trajectory. The agent had the report, the code, the logs, and-in 660 cases-a written recognition that something was seriously wrong.

Nothing in the execution loop required that recognition to change the result.

We keep describing this as a reasoning problem because the visible artifact is text. The agent writes a bad answer, then writes a good critique of the bad answer, so the system appears to contain both failure and correction.

But correction is not a paragraph.

Correction is a state transition.

```text
RUNNING → REVIEW_REQUIRED → BLOCKED → REMEDIATED → COMMITTABLE
```

If “this result is invalid” and “publish this result” can both be true in the same system state, the review stage is decorative.

## Self-review is usually just another generation

A common agent loop looks approximately like this:

```python
draft = worker.run(task)
review = worker.review(draft)
final = worker.revise(draft, review)
return final
```

This can improve an answer. It can also produce a more articulate failure.

The same probabilistic system proposes the work, selects the evidence, interprets the evidence, judges itself, and decides whether the judgment matters. The review has no independent authority and frequently no independent source of truth.

Even adding a second model does not automatically fix that. Two actors are not two control planes if both operate inside the same mutable context and either can still call the production tool.

The distinction I would make is this:

> **A reviewer produces a judgment**
>
> **A gate changes what the system is allowed to do**

The first is information.

The second is authority.

I call the distance between them the **review-to-effect gap**: the part of the pipeline between detecting a problem and the final point where the system can still prevent an externally visible result.

The wider that gap, the easier it is for a correct diagnosis to become an irrelevant log entry.

## The agent refused after it acted

[AgentAbstain](https://arxiv.org/abs/2607.10059) tested 17 frontier models in four agent harnesses on 263 paired tasks across 42 executable sandbox environments.

Each pair contained a normal task and a minimally changed version where the correct behavior was to stop. The best tested agent achieved 59.5% paired accuracy: it correctly handled both the act and abstain sides in fewer than three out of five pairs.

The paper also separated what the agent **said** from what it **did**.

In 115 trajectories, 2.6% of the aggregate abstention-run breakdown, the agent crossed an irreversible action boundary and then verbally claimed restraint. The authors call this **post-hoc abstention**.

Their sandbox examples included agents canceling a flight before noticing conflicting rebooking constraints and submitting unauthorized simulated bank transfers after acknowledging that a required verifier was unavailable.

The final message could say “I cannot proceed.”

The tool trace said it already had.

This is the same structural failure as the research report. The model discovers the trigger, generates the correct language, and reaches that language after the effect boundary has been crossed.

An apology is not a rollback.

A refusal is not a refusal if the transaction log contains a commit.

## The reviewer arrived after the side effect

The clearest timing experiment I found is [Out-of-Band Policy Enforcement at a Trusted Tool Boundary](https://arxiv.org/abs/2608.27646).

The authors ran 3,621 trials against controlled Jira and ServiceNow mocks. Their trace-level failure definition included any of three events:

- protected data entered model context
- an exact protected value appeared in the answer
- a forbidden backend effect completed

Detailed prompt rules alone still produced a 57.6% trace-failure rate in the primary comparison. Adding an enforcement boundary between the agent and the backend reduced it to 0.2%.

The paper then compared two mechanisms directly on Claude Sonnet 4.6.

One left the tool path untouched and asked a fixed reviewer model to pass or replace every assistant message. The other mediated the request before dispatch and the response before it re-entered agent context.

The output-review arm had a 58.6% deterministic trace-failure rate and 19.7% safe-useful completion.

The full boundary had 0.0% trace failure in that arm and 63.0% safe-useful completion.

The reviewer also required 930 additional model calls.

The important result is not that one reviewer prompt was weak. The paper explicitly says this is one mechanism comparison, not a ranking of every possible guardrail.

The important result is that the reviewer saw the assistant message **after the tools had returned**.

It could suppress unsafe text.

It could not remove data already placed in context.

It could not undo a backend mutation.

A post-output safety filter is a censor. It is not a transaction boundary.

## Review before dispatch helps - but it is still probabilistic

Moving the reviewer earlier is useful.

[Reinforced Agent](https://arxiv.org/abs/2604.27233) puts a specialized reviewer in front of provisional tool calls. The call is reviewed before execution, and the worker can revise it before anything changes outside the agent.

That architecture improved the reported tool-calling benchmarks. It also exposed the reviewer’s own failure rate.

With o3-mini as reviewer, 36.8% of base-agent errors were corrected while 11.7% of previously correct cases were damaged. The reported benefit-to-risk ratio was 3.1 to 1.

That is a useful component.

It is not a proof boundary.

A model reviewer is good for semantic questions that deterministic code cannot answer cheaply:

- Does this action satisfy the user’s actual intent
- Is the evidence sufficient for this conclusion
- Does the requested operation conflict with a policy expressed in natural language
- Is the proposed scope disproportionate to the task

It should not be the only thing standing between a stochastic plan and production credentials.

The reviewer may recommend `ALLOW`, `HOLD`, or `DENY`.

The trusted boundary must decide whether a valid capability exists for the exact operation about to execute.

## The architecture I would ship

The planner, reviewer, policy engine, and effect adapter have different jobs. Collapsing them into one “agent” object hides the boundary that matters.

```text
UNTRUSTED DECISION PLANE

user intent
    ↓
planner
    ↓
proposed action + evidence bundle
    ↓
semantic reviewer

TRUSTED CONTROL PLANE

schema and invariant checks
    ↓
policy and authorization decision
    ↓
exact action manifest
    ↓
short-lived commit capability

EFFECT PLANE

effect adapter holding credentials
    ↓
provider commit
    ↓
terminal receipt or durable uncertainty state
```

“Untrusted” here does not mean malicious. It means **non-authoritative**.

The planner may be brilliant. The reviewer may be more capable than the planner. Neither should be able to convert its own text directly into an authenticated side effect.

The effect adapter should accept something closer to this:

```json
{
  "proposal_id": "refund_0184",
  "operation": "payments.refund",
  "resource": "payment_intent:pi_7F...",
  "arguments_hash": "sha256:9fa...",
  "evidence_hash": "sha256:1bd...",
  "policy_version": "refunds@7.2",
  "provider_state_version": "captured@2026-09-01T10:42:18Z",
  "review": {
    "decision": "allow",
    "risk": "low",
    "reason_codes": ["amount_within_limit", "recipient_verified"]
  },
  "commit_capability": "cap_opaque_single_use"
}
```

The adapter then verifies the hashes, policy version, current provider state, capability scope, expiry, and single-use status before it calls the provider.

The natural-language conversation is evidence for constructing the manifest.

It is not the manifest.

## Five invariants that turn review into control

### 1 Critical findings must change system state

A critical finding cannot coexist with a committable action.

```text
review.severity == critical
    ⇒ run.state == BLOCKED
    ⇒ commit_capability == null
```

Do not rely on the worker to “take the feedback into account.” Make remediation create a new proposal and a new review record.

### 2 Approval must bind the exact action

“Refund the customer” is not sufficient authorization.

The gate should bind the operation, acting identity, resource, arguments, evidence version, policy version, and relevant external state. If any bound field changes, the old approval is invalid.

### 3 The credential holder must sit below the gate

The worker and reviewer should not hold direct production credentials.

Otherwise the controlled path is optional. An agent that can bypass the gateway eventually will-through a bug, a fallback, an alternate connector, or a tool call the policy layer never saw.

### 4 Uncertain delivery must not mint fresh authority

A timeout does not mean no effect occurred.

If the provider may have committed but the response was lost, the original authorization must remain occupied until reconciliation reaches a terminal result. Creating a fresh approval for a blind retry can turn one user decision into two external effects.

### 5 The final answer must be generated from the effect receipt

Do not let the agent report operational state from memory.

The user-facing response should be projected from the durable provider result or uncertainty record. That makes “I refused” impossible when the effect ledger says “committed.”

## The gate has to survive retries and recovery

Admission is only the start of authority.

[AID-Guard](https://arxiv.org/abs/2608.21159) frames the remaining problem as **authorization-to-effect closure**. It revalidates the exact approved request and provider state at commit, keeps the original reservation while delivery is ambiguous, and permits release or one successor only after terminal evidence or certified no effect.

Its target invariant is simple:

```text
one approval lineage → at most one provider effect
```

In the paper’s bounded evaluation, all 210 Stripe test-mode provider-contract trials matched their declared outcomes, and the tested recovery and confirm/cancel schedules produced no duplicate effect.

That is not a universal exactly-once guarantee. The authors used bounded provider schedules, test-mode contracts, synthetic credentials, and a high-latency prototype. Their strict exact-manifest profile also reduced benign utility substantially.

But the architecture names a production bug most agent diagrams skip:

> Retry and recovery are authority transitions, not transport details

A gate that protects the first call but disappears during timeout recovery is not end-to-end enforcement.

## What these numbers do not prove

I am not claiming that 82.5% of all production agents knowingly ship invalid work.

That number is the label rate for one new prerelease dataset of autonomous scientific-research trajectories. Most of its 800 annotations were produced by an artifact-aware agent judge calibrated against 50 human-labeled trajectories. The paper found the pattern across all eight tested systems, but it did not test the orchestration intervention I am proposing.

AgentAbstain uses generated tasks in executable sandboxes. Its post-hoc abstention rate is a benchmark result, not an estimate of real banking or travel incidents.

The policy-boundary study used controlled Jira and ServiceNow mocks and intentionally concentrated on cases where policy should intervene. Its 0.2% headline is conditional effectiveness inside that test design, not a promise for arbitrary production traffic. Durable approval and broad write controls were outside its primary evaluation.

AID-Guard tested finite provider schedules and does not establish arbitrary provider linearizability.

What survives those caveats is the mechanism.

Across research reports, abstention tasks, data exposure, and state-changing tools, the same failure appears:

1. The system detects the problem
2. The detection is represented as text
3. The text has no binding relationship to the effect path
4. The effect proceeds or has already happened

That is not a missing sentence in the system prompt.

It is a missing control boundary.

## The next boundary

My last article asked who owns the harness.

This one asks who owns the commit.

The model can propose an action. It can criticize the action. It can explain exactly why the action is unsafe and still take it, because awareness and authority are different capabilities.

A review that cannot block the effect is not a control.

It is a log entry.

**What in your agent stack can actually stop the commit-and does it run before or after the side effect?**

## Sources and further reading

- [How Do Agents Fail on AutoResearch](https://arxiv.org/abs/2608.14905)
- [AgentAbstain - Do LLM Agents Know When Not to Act](https://arxiv.org/abs/2607.10059)
- [Out-of-Band Policy Enforcement at a Trusted Tool Boundary](https://arxiv.org/abs/2608.27646)
- [Reinforced Agent - Inference-Time Feedback for Tool-Calling Agents](https://arxiv.org/abs/2604.27233)
- [AID-Guard - Stateful Authorization for Delegated Agent Effects](https://arxiv.org/abs/2608.21159)

**Disclosure:** I wrote the original drafts in my native language and conducted the research, source selection, analysis, and conclusions myself. AI was used only for translation and English-language editing.
