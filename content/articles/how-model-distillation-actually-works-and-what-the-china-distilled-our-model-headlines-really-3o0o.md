---
title: >-
  How Model Distillation Actually Works (and What the 'China Distilled Our
  Model' Headlines Really Mean)
slug: >-
  how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o
description: >-
  A practical, no-hype explainer of knowledge distillation in LLMs - the actual
  mechanics, why distilling from a closed API is different, and what the
  OpenAI/Anthropic vs DeepSeek allegations are really about.
published: true
date: '2026-05-29T12:11:12Z'
updated: '2026-05-29T12:11:12Z'
readingTime: 6
tags:
  - machinelearning
  - ai
  - llm
  - deeplearning
language: en
coverImage: ''
source: dev
sourceUrl: >-
  https://dev.to/p0rt/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o
devId: 3778167
canonicalUrl: >-
  https://sergei-parfenov.com/blog/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o/
---

Every few weeks a headline drops: *"Chinese lab distilled a frontier model from OpenAI / Anthropic."* Cue the comments - half the thread thinks distillation is a synonym for theft, the other half thinks it's some exotic Chinese trick.

Both are wrong. Distillation is one of the most boring, well-established techniques in deep learning, and the labs raising the alarms use it on their own models constantly. The actual controversy is narrower and more interesting than the headlines. Let's separate the engineering from the geopolitics.

## What distillation actually is

Knowledge distillation trains a small **student** model to imitate a large **teacher** model. The classic framing comes from Hinton et al. (2015): instead of training the student only on ground-truth labels, you also train it to match the teacher's output distribution.

Why does that help? Because the teacher's *full probability distribution* carries far more information than the single correct answer. If a teacher classifies an image of a dog, it might output `dog: 0.9, wolf: 0.08, cat: 0.001`. That "dog and wolf are similar, cat is not" signal - Hinton called it **dark knowledge** - is exactly what a small model struggles to learn from hard labels alone.

There are two kinds of training signal:

- **Hard labels** - the final answer (the token the teacher actually produced, or the ground-truth label).
- **Soft labels** - the teacher's full probability distribution over outputs, usually its logits passed through a softmax.

The trick is **temperature**. You divide the logits by a temperature `T > 1` before the softmax, which flattens the distribution and exposes those small-but-meaningful probabilities the student should learn from.

The loss is a blend of two terms: a standard cross-entropy against the real labels, and a KL-divergence pulling the student's softened distribution toward the teacher's.

```python
import torch.nn.functional as F

def distillation_loss(student_logits, teacher_logits, labels, T=2.0, alpha=0.5):
    # 1. Standard loss: student vs ground truth (hard labels)
    hard_loss = F.cross_entropy(student_logits, labels)

    # 2. Distillation loss: student vs teacher's softened distribution (soft labels)
    soft_targets = F.softmax(teacher_logits / T, dim=-1)
    student_log_probs = F.log_softmax(student_logits / T, dim=-1)
    # T**2 keeps gradient magnitudes balanced when T > 1
    soft_loss = F.kl_div(student_log_probs, soft_targets, reduction="batchmean") * (T ** 2)

    return alpha * hard_loss + (1 - alpha) * soft_loss
```

For LLMs the same idea applies per token: the teacher's next-token distribution is the soft target. In practice teams mix hard and soft labels - recent work argues the gain from mixing comes less from "matching the teacher better" and more from reducing *exposure bias* (the train/inference distribution mismatch). The point: this is normal, published, peer-reviewed engineering.

And labs distill their own models all the time. The cheap, fast variant of a flagship model that you actually get to call in production? Very often a distilled student. Anthropic itself, in the middle of its own complaint about Chinese firms, acknowledged that AI companies *routinely* distill their own models to make smaller, cheaper versions.

## Why distilling from a closed API is a different beast

Here's the part the headlines skip. Everything above assumes you have the teacher's **logits** - the raw output distribution. That's **white-box distillation**, and it requires access to the model's internals or at least its full probability outputs.

You do **not** get logits from a closed commercial API like Claude or GPT. You get text. That forces **black-box** (a.k.a. sequence-level) distillation:

1. Prompt the teacher with lots of inputs.
2. Collect its generated text outputs.
3. Build a synthetic dataset of (prompt → teacher answer) pairs.
4. Fine-tune your student on that dataset with supervised fine-tuning, often followed by RL.

You lose the dark knowledge in the soft labels, but it turns out you can get remarkably far just by training on a large, high-quality synthetic dataset generated by a strong teacher. This is exactly why "did model X learn from model Y's outputs?" is such a live and hard-to-prove question - the evidence isn't a stolen weights file, it's statistical fingerprints in behavior (a model that randomly claims to *be* ChatGPT, mirrors another model's quirks, etc.).

| | White-box | Black-box (closed API) |
|---|---|---|
| Needs | Logits / weights | Just text outputs |
| Signal richness | High (full distribution) | Lower (final answers) |
| Feasible against a closed model? | No | Yes |
| What the China allegations are about | - | This one |

## So what are the actual allegations?

Strip the drama and here's the documented timeline:

- **Jan 2025** - After DeepSeek's R1 launch, OpenAI and Microsoft open an investigation into whether DeepSeek used ChatGPT outputs to train it. Users noticed R1 behaving suspiciously ChatGPT-like.
- **Feb 2026** - OpenAI sends a memo to the U.S. House Select Committee on China alleging DeepSeek used obfuscated third-party routers to access OpenAI models and programmatically extract outputs for distillation, in violation of its terms of service.
- **Feb 24, 2026** - Anthropic publicly accuses three Chinese firms - **DeepSeek, Moonshot AI, and MiniMax** - of coordinated "distillation attack" campaigns: flooding Claude with crafted prompts, allegedly via commercial proxy services running tens of thousands of accounts to sidestep Anthropic's China access restrictions.

Two things matter here, and most coverage gets them backwards:

1. **These are allegations.** The labs have not, as of writing, published the full underlying evidence, and the accused firms dispute or haven't confirmed them. Behavioral similarity is suggestive, not proof.
2. **The dispute is not "distillation = bad."** As one ethics researcher put it after Anthropic's statement, if Anthropic itself calls distillation legitimate and widespread, the controversy can't be the technique. It's two narrower things: **unauthorized access** (using proxies to evade geographic and account restrictions) and **terms-of-service violations** (most frontier APIs explicitly forbid using outputs to train a competing model). It's closer to a contract-and-access fight than an IP-theft slam dunk - and the legal status of "training on another model's outputs" is genuinely unsettled.

## "How long does it take / how much does it cost?"

This is the question everyone asks, and the honest answer is: dramatically less than training from scratch - which is the entire economic motive - but **precise figures for any specific alleged case are not public.** Anyone quoting you an exact "they did it in N days for $M" is guessing.

What we can say structurally:

- **Pretraining a frontier model from scratch** means a massive run on tens of thousands of high-end accelerators, plus the data pipeline and research iteration behind it.
- **Distillation collapses that timeline.** The expensive part - discovering the capability - was already paid for by the teacher. The student's cost is roughly: generating a synthetic dataset (API calls + time) plus a comparatively cheap fine-tuning run. That's the asymmetry the U.S. labs are upset about: they spend billions to push the frontier, and a "free-rider" can chase it for a fraction.
- **This is also why DeepSeek's headline numbers were so contested.** Its self-reported low training cost and modest hardware footprint were precisely what made rivals suspect a shortcut: it's much easier to hit those numbers if you bootstrapped from an already-trained Western teacher rather than doing all the discovery yourself.

So: distillation makes a *strong-ish student* fast and cheap. It does **not** let you leapfrog *past* the teacher - a student is generally capped by the teacher it learned from. You don't distill your way to the frontier; you distill your way to a cheap copy of someone else's.

## Takeaways

- Distillation is standard, published deep-learning practice. The labs complaining about it use it themselves.
- White-box distillation needs logits; closed APIs only expose text, so distilling from Claude/GPT means **black-box** training on generated outputs.
- The OpenAI and Anthropic allegations against DeepSeek, Moonshot, and MiniMax are about **unauthorized access and ToS violations**, not about distillation being inherently illegitimate - and they remain *allegations*.
- The economic point is real: distillation is far cheaper than frontier pretraining, which is why it's a business and policy flashpoint. But a student is bounded by its teacher.

If you want the deep technical version of any of these - the math of temperature scaling, why mixing hard and soft labels beats either alone, or how behavioral fingerprinting tries to *detect* distillation - let me know in the comments.

---

### Sources & further reading

- OpenAI memo to the U.S. House Select Committee on China (Feb 2026) - reporting via Reuters and Rest of World.
- "Anthropic joins OpenAI in flagging distillation campaigns by Chinese AI firms," CNBC, Feb 24, 2026.
- Hinton, Vinyals, Dean, "Distilling the Knowledge in a Neural Network" (2015).
- "Understanding LLM Distillation Techniques," MarkTechPost, 2026.
- "The Bridge-Garden Dilemma in LLM Distillation," arXiv:2605.26246.
- Winston & Strawn, "Is AI Distillation by DeepSeek IP Theft?" (analysis of the legal gray zone).
