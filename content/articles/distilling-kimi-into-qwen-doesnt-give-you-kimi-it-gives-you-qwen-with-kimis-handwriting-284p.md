---
title: >-
  Distilling Kimi Into Qwen Doesn't Give You Kimi. It Gives You Qwen With Kimi's
  Handwriting
slug: >-
  distilling-kimi-into-qwen-doesnt-give-you-kimi-it-gives-you-qwen-with-kimis-handwriting-284p
description: >-
  What actually transfers when you fine-tune an open model on a frontier model's
  reasoning traces: the mechanics, the evidence it works, the evidence it mostly
  moves format, and how to tell which one you got.
published: true
date: '2026-08-10T12:40:37Z'
updated: '2026-08-10T12:40:37Z'
readingTime: 11
tags:
  - machinelearning
  - ai
  - llm
  - opensource
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fw8pah8frv0tjc7vn01xb.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/distilling-kimi-into-qwen-doesnt-give-you-kimi-it-gives-you-qwen-with-kimis-handwriting-284p
devId: 4332787
canonicalUrl: >-
  https://sergei-parfenov.com/blog/distilling-kimi-into-qwen-doesnt-give-you-kimi-it-gives-you-qwen-with-kimis-handwriting-284p/
---

On July 22, 2026, White House OSTP director Michael Kratsios accused Moonshot AI of distilling Anthropic's Fable 5 to build Kimi K3, and Treasury put sanctions on the table. No technical evidence was published, and researchers immediately pointed out the timeline problem: by K3's launch day, Fable 5 had been publicly reachable for roughly 18 days in total.

Everyone argued about whether it happened. Almost nobody asked the more useful engineering question: **if it did happen, what would Moonshot actually have received?**

Here is the experiment that answers it. In 2025, the Berkeley team behind Sky-T1 fine-tuned a model on long reasoning traces whose **final answers were wrong**. Accuracy dropped by 3.2 points. They randomized half the numbers inside the reasoning steps: 3.3 points. Then they shuffled the *order* of the steps, and performance collapsed. The content of a distill is nearly disposable. The structure is the payload.

That is the folk model's blind spot. The folk model says: pour a strong model's outputs into an open model, get a model at the strong model's level. What actually crosses the wire is mostly the *shape* of the reasoning, and the size of the gain is set by your base model, not by how smart your teacher was.

> **TL;DR** A "distill" is a dataset of teacher traces, not a set of weights. Fine-tuning on it reliably transfers output *structure* (long chain-of-thought, backtracking, `<think>` blocks) and only narrowly transfers capability. Evidence: models trained on traces with **wrong answers** lose about 3.2 points versus correct ones, and randomizing half the numbers in the traces costs 3.3 points on AIME 2024. Real capability gains do exist (DeepSeek's R1 distills beat RL on the same base by 25 points on AIME), but they cost 800k rejection-sampled samples and a full fine-tune, not 8k samples and a LoRA. The headline benchmark jumps you see on Hugging Face are very often eval artifacts.

## What a "distill" actually is

When someone says "I poured a distill into Qwen," they are not moving weights. They are running SFT on a dataset of teacher outputs. There are two distinct channels, and they behave differently:

| | Black-box (traces) | White-box (logits) |
|---|---|---|
| What you collect | Generated text, usually prompt + long CoT + answer | Full next-token distributions, or hidden states |
| Loss | Cross-entropy on the teacher's tokens | KL between teacher and student distributions |
| Bits per token | One sampled token | The whole distribution ("dark knowledge") |
| Needs | API access | Weights, and enough GPUs to run the teacher |
| Works across model families | Yes | Yes, if tokenizers align |

Anything distilled from a closed API (Claude, GPT, Gemini) is black-box by construction. You cannot get logits out of an inference endpoint. This matters more than it sounds: black-box distillation is the low-bandwidth channel, and it is the only one available in the scenario the White House described.

The whole current ecosystem is downstream of two decisions made four months apart. In September 2024, OpenAI hid o1's raw chain of thought and explicitly listed competitive advantage among the reasons. In January 2025, DeepSeek shipped R1 with full traces exposed under a permissive license, and within weeks the distill wave existed: s1, LIMO, Sky-T1, and a Hugging Face shelf of "-Distill" repos. Traces are the substrate; whoever exposes them feeds the ecosystem, and hiding them is anti-distillation policy by another name. None of this is exotic in-house either: Google's own Gemini 1.5 technical report states that Flash is online-distilled from the much larger Pro. Every lab does this to its own models. The fight is only ever about doing it to someone else's.

Kimi is the interesting inverse case. K3 shipped as open weights in late July 2026 at 2.8 trillion parameters, so white-box distillation *from* Kimi is legally and technically on the table. The gate is not access, it is the inference bill for generating traces from a model that needs roughly 1.4 TB of fast memory resident before you load any context.

## The case that it genuinely works

DeepSeek ran the cleanest public experiment on this, and it is still the strongest pro-distillation datapoint we have.

They generated about 600k rejection-sampled reasoning traces plus 200k general samples from R1, then ran plain SFT for two epochs on off-the-shelf open bases. No RL on the students at all. Then they asked the obvious control question: what if you skip the teacher and just run large-scale RL on the same base?

| Qwen-32B base, three treatments | AIME 2024 | MATH-500 | GPQA-D | LiveCodeBench |
|---|---|---|---|---|
| QwQ-32B-Preview (reference) | 50.0 | 90.6 | 54.5 | 41.9 |
| RL directly on the base, 10k+ steps | 47.0 | 91.6 | 55.0 | 40.2 |
| SFT on 800k R1 traces | **72.6** | **94.3** | **62.1** | **57.2** |

That is a 25 point gap on AIME in favor of distillation, against an RL run that cost far more compute. DeepSeek's own conclusion was blunt: distilling a powerful model into a smaller one works, while small models relying on large-scale RL need enormous compute and may still lose.

This is not just curve-sharpening either. A widely cited ICML/NeurIPS 2025 analysis measured pass@k rather than pass@1 and found the two methods differ in kind. RLVR raises pass@1 while *narrowing* the reasoning boundary at large k, because the paths it reinforces were already in the base's sampling distribution. Distillation raises the curve at every k (on Qwen-7B: pass@1 from 28% to 45%, still above 90% at pass@256), meaning genuinely new reasoning patterns entered the model.

So: yes, capability moves. Hold that thought.

## The case that it isn't what you think

Back to the corruption experiment from the intro, with the setup spelled out. The Sky-T1 team first got +40 points on AIME 2024 by fine-tuning Qwen2.5-32B-Instruct on just 17k long-CoT traces distilled from R1. Only then did they start breaking the training data on purpose, and found that only structural damage (shuffling, inserting, deleting steps) actually hurt, while wrong answers and randomized numbers cost ~3 points each. Their conclusion sits in the paper's own title: structure, not content, is what matters.

Two more datapoints point the same way. s1 hit strong reasoning numbers with 1,000 samples. LIMO used 817. If a thousand examples move a benchmark 40 points, you are not transferring a frontier lab's knowledge in a thousand examples. You are flipping a switch that was already wired.

This is the same finding that killed the first imitation wave in 2023. Berkeley's "False Promise of Imitating Proprietary LLMs" found crowd workers rated ChatGPT imitators as competitive, while targeted benchmarks showed they closed little to none of the gap: they mimicked style, not factuality. Thinking Machines said the same thing in 2025 about off-policy distillation, that the student learns the teacher's style and confidence without necessarily learning its accuracy.

## A worked example at 0.01% of the weights

Here is the exact thing the question is usually about, done in public and documented honestly.

Someone took `Qwen3.6-35B-A3B`, generated ~7.8k reasoning traces from Kimi K2.6 via OpenRouter, and ran SFT with Unsloth and LoRA. Attention-only adapters, `r=16`, 980 steps, about 21 hours on a single H200. Trainable parameters: 3.44M out of 35.1B. That is 0.01% of the model.

The model card then does something almost nobody does. It reports evals that undercut the model:

| Benchmark, same pipeline both sides | Base Qwen3.6-35B-A3B | Kimi-distill |
|---|---|---|
| MATH-500 (0-shot, `math_verify`) | **53.0** | 47.0 |
| GPQA Diamond (0-shot CoT) | **79.29** | 75.25 |
| GSM8K (8-shot, strict-match) | 64.0 | 92.67 |

The author's read on that GSM8K number is the important part: the base scoring 64% is implausible for a frontier 35B-A3B, and the likely cause is that the few-shot template never triggers the base's thinking mode. So the +28.67 point "win" measures *"my pipeline rewards models that always think,"* not capability. His stated conclusion is that the run provides no evidence the distillation improved raw reasoning over the base. What it does provide is a guarantee: the distill emits `<think>` blocks regardless of prompt shape, where the base's thinking mode is conditional.

That is a real, useful property. It is also exactly what "handwriting transplant" means. And note the cost signature: Kimi's traces averaged 2,933 tokens against 849 for a matched Claude Opus 4.7 set, roughly a 2.5x compute multiplier for the same number of rows.

## The price list

Dollar figures are illustrative (cloud rates move), but the orders of magnitude are the point:

| Run | Data | Compute | What you demonstrably get |
|---|---|---|---|
| s1-32B (Stanford) | 1,000 curated Gemini traces | 26 min on 16 H100s, ~$25 at cloud rates | Thinking format + test-time scaling; beats o1-preview on competition math |
| Kimi K2.6 → Qwen3.6 LoRA | 7.8k K2.6 traces via OpenRouter | ~21 h on one H200 | Unconditional `<think>` blocks; no measured capability gain over base |
| DeepSeek R1 distills | 800k rejection-sampled samples | Full SFT, 2 epochs, six bases | +25 pts on AIME over RL on the same base |
| Thinking Machines on-policy | Teacher-scored student rollouts | 1,800 GPU-hours (their RL baseline: 17,920) | ~70% AIME'24, RL parity at ~10% of the compute |

Read top to bottom and the pattern is the whole article: the format transplant costs lunch money, the capability transfer costs a training run.

## So what actually crossed the wire?

Until recently this was unanswerable per output. A December 2025 paper proposes a provenance-tracing framework that scores every sentence a distilled model produces under three models (teacher, original student, distilled student) and sorts it into four buckets: teacher-originated, student-originated, already present in both, and pre-existing but boosted by distillation. In their analysis, teacher-originated actions do appear in unseen test contexts and correlate with correctness, but a large share of what the distilled model emits is student-internal patterns that distillation merely amplified, and not all of that amplification helps.

One more mechanism worth knowing, because it bounds the cross-family case. Anthropic Fellows work published in Nature this year showed models can transmit behavioral traits through data with no semantic connection to those traits, including through reasoning traces and code. The catch: the effect only appears when teacher and student share the same base model or a behaviorally matched one. Across families it disappears. So a Fable-to-Kimi transfer, if it happened, has only the visible-traces channel open. The spooky hidden channel is not available across architectures.

## The bill

Distillation is not free, and the invoice arrives in three places.

**Capacity gap.** Apple's distillation scaling law found the student's loss improves with teacher strength only up to a point, after which a stronger teacher produces a *worse* student. The teacher becomes harder to model, and the student can no longer absorb the gains. Picking the strongest available teacher is not automatically correct.

**Distribution mismatch.** Off-policy SFT trains the student to navigate states the teacher visits. At inference the student is in its own states, which it never trained for, and errors compound over long chains. This is the structural argument for on-policy distillation, where the student generates and the teacher scores each token. Thinking Machines reported roughly 70% on AIME'24 for 1,800 GPU-hours where their RL baseline needed 17,920, and framed the reason cleanly: RL delivers about O(1) bits of signal per episode, distillation delivers O(N) bits, one per token.

**Forgetting.** A 2026 paper on post-training with knowledge retention reports that SFT on rejection-sampled Gemini 2.5 Pro responses dropped IFEval by 11.5 points on Llama-3.1-8B-Instruct, and even eroded in-domain reasoning on Qwen3-8B from 46.8% to 41.0%. You are not adding a skill to a static model. You are moving the whole distribution, and things fall out of it.

## Checklist: capability transfer or handwriting transplant?

| Factor | Handwriting only | Capability actually moves |
|---|---|---|
| Data scale | 1k to 20k traces | 100k+, rejection-sampled against verified answers |
| What you train | Attention-only LoRA, 0.01% of params | Full fine-tune, or LoRA over FFN/experts too |
| Teacher gap | As large as possible | Inside the capacity-gap range for your student |
| Domain | Traces from one domain, eval in another | Traces drawn from the distribution you'll deploy on |
| Policy | Off-policy SFT only | On-policy phase after the cold start |
| Eval | pass@1, one pipeline, base's thinking mode never invoked | pass@k, identical pipeline, thinking mode forced on both sides, OOD and instruction-following held out |

If your setup sits mostly in the left column, you did not get a frontier model. You got your base model that now reliably reasons out loud. Ship it if that is what you needed. Just do not put "matches Kimi K2.6" in the model card.

## Back to Kimi K3

Numbers first, because most coverage skipped them. In February 2026, Anthropic publicly attributed more than 16 million Claude exchanges across roughly 24,000 fraudulent accounts to coordinated campaigns by Moonshot, DeepSeek, and MiniMax, over 3.4 million of them pinned on Moonshot alone. In June, Anthropic told the US Senate Banking Committee that Alibaba's Qwen lab had run the largest known distillation attack to date. So industrial-scale trace harvesting is on the record as a specific, quantified allegation, months before Kratsios spoke.

The Fable-to-K3 link is the shaky part. Per press reconstructions of the timeline, Fable 5 launched June 9, was suspended June 12 under export controls, and returned July 1; K3 launched July 16. That is the ~18 days from the intro. K3's pretraining necessarily predates all of it, so the only technically coherent version of the accusation is targeted post-training on Fable-derived traces over an already-trained base. Which is precisely the scenario this article is about: it would buy behavioral transfer in the domains the traces covered, at black-box bandwidth, from under three weeks of harvesting. It would not buy the pretraining run, and pretraining is the part nobody knows how to distill, because the parameter space is specific to each network.

I wrote earlier about the [legal and ToS side of this](https://dev.to/p0rt/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o) and I want to correct my own emphasis: framing distillation primarily as an IP question makes it sound like the technique hands over a copy of the model. It does not. The interesting question was always mechanical, and the mechanical answer constrains the policy answer.

Caveats on my own sources, since I am asking you to update on them: DeepSeek's numbers are self-reported, the Kimi-distill evals above are single-run and small-sample by the author's own admission, and the White House claim has no published evidence behind it.

**Question for anyone who has actually run one of these:** what is the one eval in your harness that would have caught a benchmark jump that was really just your base model's thinking mode failing to trigger? I suspect most of us do not have one, and that is why the Hugging Face leaderboard looks the way it does.

---

## Sources & further reading

- [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via RL](https://arxiv.org/abs/2501.12948) (Tables 5 and 6, distillation vs RL)
- [Does RL Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?](https://arxiv.org/abs/2504.13837) (pass@k; distillation expands the boundary, RLVR narrows it)
- [LLMs Can Easily Learn to Reason from Demonstrations: Structure, not content, is what matters!](https://arxiv.org/abs/2502.07374) (the corruption experiments)
- [The False Promise of Imitating Proprietary LLMs](https://arxiv.org/abs/2305.15717) (style vs factuality, 2023)
- [Distillation Scaling Laws](https://machinelearning.apple.com/research/distillation-scaling-laws) (capacity gap)
- [On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/) (Thinking Machines Lab)
- [Where Did This Sentence Come From? Tracing Provenance in LLM Reasoning Distillation](https://arxiv.org/abs/2512.20908)
- [Language models transmit behavioural traits through hidden signals in data](https://www.nature.com/articles/s41586-026-10319-8) (Nature; [preprint](https://arxiv.org/abs/2507.14805))
- [Surgical Post-Training: Proximal On-Policy Distillation with Knowledge Retention](https://arxiv.org/abs/2603.01683) (forgetting numbers)
- [Qwen3.6-35B-A3B-Kimi-K2.6-Reasoning-Distilled model card](https://huggingface.co/lordx64/Qwen3.6-35B-A3B-Kimi-K2.6-Reasoning-Distilled) (the honest eval section)
- [s1: Simple test-time scaling](https://arxiv.org/abs/2501.19393) (1,000 samples, 26 minutes on 16 H100s)
- [Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) (OpenAI on hiding o1's raw chain of thought)
- [Gemini 1.5 technical report](https://arxiv.org/abs/2403.05530) (Flash is online-distilled from Pro)
- [Trump tech official accuses China's Moonshot AI of stealing from Anthropic](https://www.scmp.com/news/us/diplomacy/article/3361510/trump-tech-official-accuses-chinas-moonshot-ai-stealing-anthropic) (SCMP), [The New Stack](https://thenewstack.io/moonshot-fable5-distillation-accusations/) (the 16M / 24,000 numbers), and [Glitchwire](https://glitchwire.com/news/trump-administration-accuses-moonshot-ai-of-distilling-anthropics-fable-escalati/) (Moonshot's 3.4M, the June Senate claim about Qwen)
- [Kingy.ai's timeline reconstruction](https://kingy.ai/blog/kimi-k3-fable-5-distillation/) (Fable 5 availability windows vs K3's release)
- [Kimi K3 launch notes](https://simonwillison.net/2026/Jul/16/kimi-k3/) (Simon Willison)
