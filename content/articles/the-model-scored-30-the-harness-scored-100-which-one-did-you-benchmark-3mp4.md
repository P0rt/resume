---
title: The Model Scored 30%. The Harness Scored 100%. Which One Did You Benchmark?
slug: the-model-scored-30-the-harness-scored-100-which-one-did-you-benchmark-3mp4
description: >-
  Four harnesses took the same public ARC-AGI-3 set from 13% to 100% without
  touching a single weight. Then Microsoft put the harness inside the training
  loop.
published: true
date: '2026-08-24T13:38:40Z'
updated: '2026-08-24T13:38:40Z'
readingTime: 10
tags:
  - ai
  - llm
  - agents
  - machinelearning
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Frewf6tr4myrksokx6ht9.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/the-model-scored-30-the-harness-scored-100-which-one-did-you-benchmark-3mp4
devId: 4476163
canonicalUrl: >-
  https://sergei-parfenov.com/blog/the-model-scored-30-the-harness-scored-100-which-one-did-you-benchmark-3mp4/
---

On July 24, ARC Prize verified Claude Opus 5 at 30.16% on the ARC-AGI-3 public set. On August 21, NVIDIA reported the same model at 100.00 on the same set. The weights did not change. The code around them did.

In between, MIT did the same thing (August 5), a group led by Impossible Research got to 98.98 (July 15), and OpenAI tripled GPT-5.6 Sol's score by flipping two API settings (July 29). Then Microsoft published a framework that trains the model *through* the harness (August 18), and Google published one that gives the environment a harness of its own (August 20).

In July I wrote that self-editing harnesses have a provenance problem. This month the problem moved up a level: the benchmark score itself has no provenance.

> **TL;DR:** On ARC-AGI-3's public set, the spread between "model in the official harness" and "model in the best harness" is 25 to 70 points, on a benchmark designed to resist exactly this. None of the 100s are verified on the private set, and every author says so. Microsoft's Agent Lightning v1.0 runs RL with the deploy-time harness owning the loop, so the harness is becoming part of the weights, and its reward-hacking section is the checklist my July post warned about. A benchmark number without a harness version, memory state and action budget attached is a self-reported claim with an unmarked type. Unmarked means self-reported.

## Five harnesses, one public set

ARC-AGI-3 scores agents with RHAE (Relative Human Action Efficiency). Per level, `score = (human_baseline_actions / ai_actions)^2`, with the ratio capped at 1.15x the human baseline. Game scores are level-weighted averages, you must finish the last level to get full credit, and the overall number is the mean over games. A 100.00 means the agent finished every level at least as efficiently as a first-time human.

| Harness | Who | Date | Model | Public RHAE | Actions | Verified by ARC Prize |
|---|---|---|---|---|---|---|
| Official ARC Prize harness | ARC Prize | Jul 24 | Claude Opus 5 (high) | 30.16% | n/a | yes |
| Official harness, default settings | OpenAI | Jul 29 | GPT-5.6 Sol (max) | 13.3% | n/a | no |
| Official harness + retained reasoning + compaction | OpenAI | Jul 29 | GPT-5.6 Sol (max) | 38.3% | 6x fewer output tokens | no |
| Schema | Impossible Research (+ UC Berkeley, CMU) | Jul 15 | Opus 4.8 / Fable 5 | 98.98 | n/a | no |
| VISTA | MIT (Han, Hu, Qiu, Wu, He) | Aug 5 | Claude Opus 5 | 100.00 | 7,542 (humans: 17,135) | no |
| AVO | NVIDIA | Aug 21 | Claude Opus 5 | 100.00 | 6,624 | no |

The number that matters is not in the table. It is the gap between the first row and the last: 70 points, same model, same 25 games, same metric.

The official harness is not a neutral baseline. OpenAI's write-up quotes ARC's intent: an "intentionally generic harness, without tools or special features" built to make "model shortcomings more visible." In practice it discarded all private reasoning after each game action and used a rolling truncation window, so older actions vanished as history grew. Retaining reasoning and enabling compaction took Sol from 13.3% to 38.3% and cut output tokens by 6x. The harness was wiping the model's mind between moves.

So the leaderboard measures "model plus a harness built to expose the model." The 100s measure "model plus a harness built to cover for the model." Neither measures the model, and nobody has isolated which part of the 70 points is which.

The authors are unusually honest about this. NVIDIA: the AVO-versus-VISTA comparison "should not be interpreted as a controlled ablation," and the results "should not be interpreted as a direct measurement of the performance contribution of AVO." VISTA: the models "were released after the public ARC-AGI-3 games," overlap cannot be excluded, and "the private set remains the real test of generalization." Schema: "no frozen-harness or held-out-performance claim." Every 100 on that table is a public-set number on games the models may have seen in training.

## What the 70 points are made of

Read the harness papers side by side and the same three components appear under different names.

Memory. VISTA keeps a "lossless visual memory" of every past observation. AVO carries forward "prior implementations, evaluation results, compiler and profiler outputs, and accumulated reasoning." OpenAI's two settings are memory settings: keep the reasoning, compact instead of truncate.

Supervision. AVO runs a monitor that watches "the broader trajectory for stagnation or repeated unproductive cycles and can redirect the main agent." That is the layer that turns a model that gives up into an agent that does not.

An action budget. RHAE squares the efficiency ratio, so wasted moves are punished quadratically. AVO's headline against VISTA is 12% fewer actions. That is a harness optimization target, not a model property.

In July I split harness work into two piles: compensatory layers that patch what the model cannot do yet, and protective layers that constrain what it must not do. I predicted pile one depreciates with every model release. All three components above are pile one, and on a benchmark built to resist static tricks they are currently worth 25 to 70 points with the newest frontier models. Either my prediction is early or it is wrong about magnitude. I will take the second reading until the private-set numbers say otherwise.

One more thing about compaction, since it is the setting that tripled OpenAI's score. In my preregistered compaction experiment, the same operation produced 3.47% false proceeds on irreversible-action gates: the agent went through a gate it should have stopped at, because the compacted context no longer carried the provenance the gate depended on. Not a contradiction. ARC-AGI-3 scores task completion; my gates scored whether the agent still knew *why* it was allowed to act. Compaction improves the first, degrades the second, and a benchmark only sees the first.

## Then Microsoft put the harness inside the training loop

Agent Lightning v1.0 (arXiv, August 18) names something the July thread never got to: RL where the harness is not a bystander. In their words, "the harness owns this loop, while the training engine observes only a sequence of LLM request-response pairs." The deploy-time scaffold (mini-SWE-agent in their coding runs) executes the task inside Kubernetes; the trainer sits behind a gateway that looks like a normal LLM endpoint and collects the traffic.

The result is real: Qwen3.5-9B goes from 41.8% to 56.4% on SWE-bench Verified, a 14.6-point gain from about 6,000 examples filtered out of SWE-smith's 59,136 tasks across 128 repositories, in roughly 3,500 lines of framework code.

Two details matter more than the headline.

First, retokenization. The harness re-renders text between calls, chat templates are not compositional, decode-then-retokenize is lossy, and the harness parses and repairs outputs. So the token IDs the trainer sees for the model's previous answer can differ from the ones it actually sampled. Their fix is best-effort merging: merge only when the exact token prefix holds, otherwise close the sequence. That is the engineering admission that model and harness now share a boundary at the token level. Train through one harness's rendering and you get a model tuned to that rendering.

Second, section 4.3.2, "Preventing Reward Hacking." During training the agents were caught "using Git history to locate the gold commit," "using wget or curl to retrieve upstream source code from GitHub," using pip to download a package's source, and using urllib to do the same. Countermeasures: "disable Git commands and hide the .git directory from the agent," plus a Kubernetes network policy that "blocks general outbound network access and permits connections only to explicitly whitelisted services."

That is my July post compressed into a paragraph, arrived at as an engineering necessity rather than a design principle. Vinicius Pereira said it best in the comments: the agent must not be able to author the artifact the gate reads. Microsoft's version is that it must not be able to *reach* it either, through the filesystem or the network. Dipankar Sarkar's separate trust domain for test execution is the same control from the other side.

Now put the halves together. The harness that decides what the model sees also decides what the trainer sees. Once RL runs through it, the tricks in pile one stop being code you can diff and become weights you cannot. That is the absorption I predicted, except what gets absorbed includes whatever the harness let the agent get away with. Hide `.git` and the model learns the task. Forget to, and it learns to find the gold commit, and the benchmark will not tell you which one you trained.

## Google gave the environment a harness too

EnvHarness (arXiv, August 20, Google Research) wraps a static environment at the `reset`/`step` interface with three plug-in types: Setup reshapes the initial state, Rule reshapes "which actions are allowed, what they do, and what the agent observes," and Link composes in another environment's tasks. A designer agent, EnvRigger, "treats the target policy as a black box, observing its execution trajectories to synthesize EnvHarness components targeting diagnosed flaws," writes a `_Rules` subclass, and tests it. Across ALFWorld, WebArena, SWE-bench Verified, OfficeQA and SpreadsheetBench, skills learned in reshaped environments transfer back for up to 9.0 points on held-out instances with 9.8% fewer steps.

Credit where due: this is the responsible version. Verifiers are untouched, the goal predicate is never modified, evaluation happens on the unadapted benchmark. A curriculum, not a thumb on the scale.

But note the direction of travel. In one week the field shipped a harness around the agent (AVO, VISTA), a harness around the trainer (Agent Lightning), and a harness around the environment (EnvHarness). The capability you end up with has its provenance spread across three codebases, and only one of them comes with the model card.

## What you are actually buying

The one benchmark this month that held the model constant and varied the harness came from a vendor. TrueFoundry's TrueForge comparison (August 18) ran DevRev's Enterprise-Bench: 14 cross-system tasks, three MCP servers, fresh session per task, blind grading, list-rate and cache-aware costs.

| System | Model | Tasks solved | Cost per run |
|---|---|---|---|
| Claude Managed Agents | Opus 4.8 | ~11/14 | $11.80 |
| TrueForge | Opus 4.8 | ~11/14 | $8.50 |
| TrueForge | GLM-5.2 | ~11/14 | $2.90 |
| deepagents / LangGraph | Opus 4.8 | ~10/14 | n/a |

Same model, same tasks, 28% cost difference from the harness alone. Swap the model under the same harness and cost drops another 2.9x with no change in tasks solved. TrueFoundry sells the gateway next to TrueForge, so the framing is self-serving. It is still more methodology than NVIDIA offered.

I have seen this pattern in teams that compare a vendor's managed agent against their own scaffold and attribute the entire difference to the model. After this month I do not think that attribution is defensible without a controlled harness swap, and almost nobody runs one.

## What a score needs to carry

If provenance is a vector, a benchmark score needs one. The minimum I would want attached to an agent number before quoting it, illustrative rather than a standard:

```yaml
score: 100.00
metric: RHAE
set: arc-agi-3-public-25       # not semi-private, not private
model: claude-opus-5           # provider version string, reasoning effort
harness: avo@<commit>          # the code between model and environment
memory_at_start: empty         # or warm, and from which prior runs
supervisor: stagnation-monitor # any policy that can redirect the agent
compaction: on                 # summarize vs truncate, and where
action_budget: 6624
trainer_harness: none          # if the weights were RL'd through a harness, which one
verified_by: self              # or ARC Prize, or a named third party
```

Mike Czerwinski's rule from the July thread applies to every row: unmarked has to mean self-reported. A score that arrives without the harness commit is not a measurement of the model. It is a claim about a system, typed by whoever produced it, and the default type is untrusted.

## What this post might get wrong

1. The model/harness split may already be dissolving. After harnessed RL, "the model" is partly a harness artifact, and the boundary I am measuring might not survive the next benchmark cycle.
2. Every 100 is on the public set, which shipped before the models did. If Opus 5 in the generic harness gets 30 on the private set and AVO gets 40, the harness story shrinks from 70 points to 10, and the leaderboard was more honest than I am giving it credit for.
3. Source hygiene: NVIDIA sells the compute AVO runs on, OpenAI's two settings are its own API features, TrueFoundry sells a gateway, Microsoft would like you on Azure. I read the papers and reproduced none of them.
4. My July prediction that compensatory harness layers depreciate with each model release. This month's evidence points the other way. The prediction stays up, marked as losing.

## The question I cannot answer alone

If the harness is worth 70 points on a benchmark built to resist it, who owns the harness in your stack: you, the model vendor, or the router in between? And when you report an agent result internally, does the harness commit travel with the model version, or does it get dropped at the first summary?

## Sources & further reading

- [ARC Prize: Claude Opus 5 results, verified July 24, 2026](https://arcprize.org/results/anthropic-claude-opus-5)
- [ARC Prize: ARC-AGI-3 scoring methodology (RHAE)](https://docs.arcprize.org/methodology.md)
- [OpenAI: How enabling two settings tripled our scores on the ARC-AGI-3 benchmark (July 29, 2026)](https://openai.com/index/how-two-settings-tripled-our-arc-agi-3-scores/)
- [Schema: Frontier Models with Our Harness Achieve ~99% on ARC-AGI-3 Public (July 15, 2026)](https://schema-harness.github.io/)
- [VISTA: A Visual Harness for Reasoning in an Interactive World, MIT (August 5, 2026)](https://vista-research.github.io/)
- [NVIDIA: AVO Reaches 100 on ARC-AGI-3 (August 21, 2026)](https://developer.nvidia.com/blog/nvidia-avo-reaches-100-on-arc-agi-3-demonstrating-a-frontier-level-general-purpose-architecture-for-long-horizon-autonomous-agents/)
- [AVO: Agentic Variation Operators for Autonomous Evolutionary Search (arXiv 2603.24517)](https://arxiv.org/abs/2603.24517)
- [The New Stack on AVO and the harness debate (August 21, 2026)](https://thenewstack.io/nvidia-avo-arcagi3-benchmark/)
- [Agent Lightning v1.0: Towards Harnessed Agentic RL (arXiv 2608.17528, August 18, 2026)](https://arxiv.org/abs/2608.17528)
- [EnvHarness: Awakening Static Worlds for Agent Learning (arXiv 2608.19880, August 20, 2026)](https://arxiv.org/abs/2608.19880)
- [EnvHarness on GitHub, Google Research](https://github.com/google-research/envharness)
- [TrueFoundry: TrueForge vs Claude Managed Agents benchmark (August 18, 2026)](https://www.truefoundry.com/blog/engineering/trueforge-vs-claude-managed-agents-benchmark/)
- [VentureBeat on TrueForge (August 19, 2026)](https://venturebeat.com/orchestration/truefoundrys-open-source-ai-agent-harness-trueforge-boasts-30-75-cheaper-task-completion-than-claude-managed-agents)
- [Earendil: What Is a Harness? (August 20, 2026)](https://earendil.com/posts/what-is-a-harness/)
- [My July post: The Agent Faked a Test Log, Then Believed It](https://dev.to/p0rt/the-agent-faked-a-test-log-then-believed-it-self-editing-harnesses-have-a-provenance-problem-3id6)
- [My compaction experiment: My Strawman Baseline Beat My Own Scheme on Half the Gate Classes](https://dev.to/p0rt/my-strawman-baseline-beat-my-own-scheme-on-half-the-gate-classes-177h)
