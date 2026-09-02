---
title: >-
  I distilled a 7B vision model into a 2B one for screenshots - and the 7B
  teacher scored worse
slug: >-
  i-distilled-a-7b-vision-model-into-a-2b-one-for-screenshots-and-the-7b-teacher-scored-worse-3akh
description: >-
  A hands-on knowledge-distillation project: Qwen2-VL-7B → 2B for UI-screenshot
  understanding, trained, evaluated and benchmarked end-to-end on an M4 Pro.
  2.4× faster - and why the teacher lost on ROUGE-L.
published: true
date: '2026-06-02T15:36:21Z'
updated: '2026-06-02T15:36:21Z'
readingTime: 9
tags:
  - machinelearning
  - python
  - llm
  - deeplearning
language: en
coverImage: ''
source: dev
sourceUrl: >-
  https://dev.to/p0rt/i-distilled-a-7b-vision-model-into-a-2b-one-for-screenshots-and-the-7b-teacher-scored-worse-3akh
devId: 3804289
canonicalUrl: >-
  https://sergei-parfenov.com/blog/i-distilled-a-7b-vision-model-into-a-2b-one-for-screenshots-and-the-7b-teacher-scored-worse-3akh/
---

**Code:** <https://github.com/P0rt/vlm-distill-screenshots>
**Model:** <https://huggingface.co/p00rt/qwen2-vl-2b-screenshots-distill>

There's a question I keep coming back to whenever someone ships a giant model: *what would I lose if I used something 3× smaller?* Not in the abstract - for **my** task, on **my** hardware, with numbers I measured myself.

So I ran the experiment. I took a 7B vision‑language model (VLM), used it as a teacher to teach a 2B student one narrow skill - **describing UI screenshots** - and then measured exactly what the trade changed: quality, latency, throughput, memory. The whole thing runs on a single MacBook Pro (M4 Pro, 24 GB).

This post is the honest write‑up: the method, the numbers, and - maybe more useful - the three or four places where reality didn't cooperate.

**TL;DR.** The distilled 2B student runs **~2.4× faster**, in **~2.4× less memory**, with **3.75× fewer parameters** than the 7B teacher, and it clearly beats the *untrained* 2B baseline on the task. The genuinely surprising part: on ROUGE‑L the **2B student scored *higher* than the 7B teacher** - which is a story about the metric, not the models, and turned out to be the most interesting thing I learned. (It's also the live exception to "a student is bounded by its teacher" that I argued about in the comments of [my last distillation post](https://dev.to/p0rt/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o) - on a narrow slice, the student really can pull ahead.)

---

## Why distill a VLM for a *narrow* domain?

The obvious objection to this whole project: "Qwen2‑VL‑2B already exists and it's good - just use it."

True. But "a good general small VLM" and "a small VLM that's *reliably* good at the one thing you need" are different products. Distillation is how you turn the first into the second: you let a stronger model define the target behavior on **your** data distribution, and the small model adopts it - no manual labelling on your side.

And distilling a *vision‑language* model is less‑travelled territory than the classic "distill BERT into something tiny" story. It drags in real inference engineering - 4‑bit teachers, LoRA, quantized runtimes, memory budgets - and that engineering is half of why it's worth writing up.

The task I picked is deliberately narrow: **screenshot understanding**. Given a UI screenshot, produce a one‑sentence summary plus a list of the key interface elements. Perception only - no clicking, no agent. (That's future work; more at the end.)

---

## The setup: task, data, metrics

**Data - [Screen2Words](https://huggingface.co/datasets/rootsautomation/RICO-Screen2Words)** (`rootsautomation/RICO-Screen2Words`, CC‑BY‑4.0): 22,417 Android UI screenshots from the RICO corpus, each with five human‑written summaries. Native splits are train / val / test = 15,743 / 2,364 / 4,310, across 28 app categories.

One detail that matters more than it looks: the human captions are **short** - median **7 words**. Hold that thought; it comes back to bite the metrics.

I picked the `rootsautomation` mirror specifically because it's **CC‑BY‑4.0** - publishable, unlike raw RICO's research‑only terms. I check the license *before* I push weights, not after. (It's in the model card.)

**Metrics.** ROUGE‑L and BLEU against the human references, plus an optional teacher‑as‑judge score. I implemented ROUGE‑L and BLEU from scratch (pure Python, multi‑reference, unit‑tested) so the numbers are deterministic and dependency‑free. CIDEr - the classic captioning metric - needs corpus‑level document frequencies; I left it as a follow‑up rather than pull in a heavy dependency.

**The pipeline**, end to end:

```plaintext
download → build_dataset → teacher_label → train → eval → benchmark
```

Every stage is a typed CLI step, all hyperparameters live in `configs/*.yaml`, and the heavy steps (labelling, training) are resumable and versioned by a config hash. I built it phase by phase, one green‑CI PR at a time.

---

## Method: three signals, one MVP

Knowledge distillation for generation has a few flavors, and I wanted the harness to support all of them behind flags so I could ablate cleanly:

1. **Response‑based KD** - the teacher generates answers, the student learns to reproduce them. The full objective mixes a soft and a hard target:

   ```plaintext
   L = α · CE(student, hard_labels)
       + (1 − α) · T² · KL( softmax(teacher/T) ‖ log_softmax(student/T) )
   ```

2. **Feature‑based** - align the student's vision features with the teacher's.
3. **Self‑distillation** - let the teacher label extra screenshots to grow the data.

The MVP I actually trained is the **hard‑target half of (1): sequence‑level distillation.** The teacher writes a description; the student is fine‑tuned (LoRA) to reproduce that *text*. No teacher logits needed at train time, which keeps the whole thing laptop‑friendly.

The soft‑KL term is implemented and unit‑tested (`response_kd_loss`), but wiring it into training needs cached teacher logits - and that's exactly the α/temperature ablation axis I *couldn't* run yet. I'd rather say that out loud than fake it.

---

## Teacher labelling

The teacher is **Qwen2‑VL‑7B‑Instruct in 4‑bit**, running through MLX on Apple Silicon. (`bitsandbytes` is CUDA‑only, so the usual 4‑bit path doesn't exist on a Mac - MLX is the way in.)

It labelled 200 training screenshots at **~10.2 s/screenshot** (≈34 minutes; ≈2.7 hours projected for the full 15.7k split). Zero outputs were flagged degenerate by a light post‑validation pass (whitespace normalization + empty/too‑short detection - cheap insurance against format drift), and the mean target length was 33.6 words. A real example:

> *"The UI screenshot shows a fitness app displaying an exercise called 'Lunges,' with a progress indicator showing 30% complete. Key interface elements include a progress bar, a figure performing the exercise, and the text 'Lunges.'"*

Notice it's **33 words** and genuinely rich. The human reference for screens like this is more like *"exercise screen"*. That gap is the whole story of the metrics section below.

---

## Training the student (and the part where MLX said no)

Plan A was to train the LoRA adapter with MLX too - same runtime as the teacher, fast on Apple Silicon. Plan A died in the backward pass:

```plaintext
ValueError: [Primitive::vjp] Not implemented for CustomKernel.
```

mlx‑vlm 0.6.0 can't backprop through one of Qwen2‑VL's custom Metal kernels. I checked the usual suspects - `scaled_dot_product_attention`, RMSNorm, RoPE all *do* have gradients - so it's a specific kernel, and both `mlx` and `mlx-vlm` were already on their latest release, so there was no version to bump to. MLX stays a great **inference** backend here; it just can't train this model yet.

Plan B: train on the **`hf` path (transformers + PEFT LoRA) on Apple MPS**, with `PYTORCH_ENABLE_MPS_FALLBACK=1`. That worked. Two more small potholes on the way:

- **The screenshots are too tall.** Qwen2‑VL expands a big RICO screenshot into *thousands* of vision tokens; with a 1k context that overflows and throws a broadcast‑shape error deep in `get_rope_index`. Fix: cap the visual‑token budget (`max_pixels`) so an image stays well under the context window.
- **A papercut:** recent `transformers` pulls in a Qwen2‑VL *video* processor that needs `torchvision` - which I hadn't installed. Easy to miss until the first run.

After that it trained cleanly: loss **0.80 → 0.39** over 40 steps, and - the part that matters for "is the checkpoint real" - I reloaded the merged adapter and it generated in the trained format ("…Key interface elements include…"). On a laptop.

---

## Results: the honest version

First, the caveat that frames everything below, because it's load‑bearing: **this is a deliberately small proof‑of‑concept.** The quality numbers come from short training runs and a tiny eval set (80 train / 16-100 test examples depending on the run). Treat them as *trends and a working method*, not a benchmark. What I'm confident in is the harness and the measurement; the absolute numbers want a full‑scale run before anyone quotes them. With that said -

Here's the quality table on the test split (ROUGE‑L / BLEU vs the human references):

| model | ROUGE‑L | BLEU |
| --- | --- | --- |
| teacher (7B) | 0.164 | 0.000 † |
| **student (2B + LoRA)** | **0.178** | 0.019 |
| baseline (2B, untrained) | 0.153 | 0.018 |

† *Teacher BLEU rounds to 0.000 - that's not a bug, it's the length mismatch explained right below.*

Read that twice, because it surprised me too: **the 7B teacher scores *lower* on ROUGE‑L than the 2B student, and its BLEU is essentially zero.**

That's not the teacher being bad - it's the metric. The teacher writes 33‑word descriptions; the human references are 7 words. BLEU rewards exact n‑gram overlap, so a rich, correct, *long* answer against a terse reference scores ~0. ROUGE‑L (longest common subsequence) is kinder but still favors brevity‑matching. So against short references, all three models cluster in a narrow band and the verbose teacher actually looks *worse*.

The honest takeaways:

1. **Distillation helped:** the student (trained on teacher outputs) beats the untrained baseline, +16% relative ROUGE‑L. That's the comparison that's actually apples‑to‑apples (same model, same speed).
2. **These metrics undersell rich outputs.** This is exactly why LLM‑as‑judge and CIDEr exist, and why I flag the ROUGE‑L/BLEU numbers as a floor, not a verdict.
3. **The clean, unambiguous win is efficiency** - so let's go there.

---

## The trade‑off (the actual point)

Same hardware, same 4‑bit setup, 128‑token generations:

| model | params (B) | latency p50 (ms) | throughput (img/s) | peak mem (GB) |
| --- | --- | --- | --- | --- |
| teacher (Qwen2‑VL‑7B) | 8.29 | 1538 | 0.63 | 5.8 |
| student (Qwen2‑VL‑2B) | 2.21 | 651 | 1.52 | 2.4 |

**~2.4× faster, in ~2.4× less memory, with 3.75× fewer parameters.**

![Quality vs speed](https://raw.githubusercontent.com/P0rt/vlm-distill-screenshots/main/assets/quality_vs_speed.png)

![Quality vs memory](https://raw.githubusercontent.com/P0rt/vlm-distill-screenshots/main/assets/quality_vs_memory.png)

The student sits in the friendly corner: as fast and light as the untrained baseline, but with the distilled quality bump on top. The teacher is off to the slow, heavy side - and, per the metrics caveat above, not even ahead on ROUGE‑L. The 2B model is the one I'd actually deploy for this task.

> ⚠️ **Honesty box.** "Peak memory" on Apple Silicon is unified‑memory allocation, not CUDA VRAM. The headline efficiency numbers are MLX/4‑bit on Apple Silicon, not a server GPU. As flagged above, the quality numbers are a small proof‑of‑concept - trends, not a benchmark result. The thing I'm confident in is the **method and the measurement harness** - both reproducible from the repo.

---

## Ablations: what actually moved quality

I varied the two knobs my sequence‑level SFT exposes - training steps and LoRA rank - at fixed everything‑else, and re‑evaluated each:

| run | LoRA r | steps | ROUGE‑L | BLEU |
| --- | --- | --- | --- | --- |
| baseline | 8 | 0 | 0.152 | 0.017 |
| - | 8 | 40 | 0.170 | 0.018 |
| - | 8 | 80 | 0.172 | 0.020 |
| - | 16 | 40 | 0.171 | 0.019 |

![Ablation: steps vs ROUGE-L](https://raw.githubusercontent.com/P0rt/vlm-distill-screenshots/main/assets/ablation_steps.png)

1. **"Train at all" is the dominant lever** - the baseline → distilled jump is by far the biggest.
2. **More steps help marginally**, and the gain shows up more on BLEU (exact phrasing sharpens) than on ROUGE‑L.
3. **LoRA rank is ~neutral** here - r8 ≈ r16. At this data scale, adapter *capacity* isn't the bottleneck, so r8 is plenty.

The α/temperature/feature‑alignment ablations from the method section belong to the **logit‑level** KD variant, which needs cached teacher logits I haven't produced yet. Three honest comparisons beat six fabricated ones.

---

## Inference engineering (the half that bites)

The modelling is the easy part. The engineering is where the hours went:

- **Two backends, one interface.** The teacher runs 4‑bit via `mlx-vlm`; the student trains/infers via `transformers` + PEFT. A small factory (`make_teacher` / `make_student`) hides which one you're on.
- **MLX can't train this model yet** (the `CustomKernel` vjp gap above) - so training is `hf`/MPS, inference can be either.
- **Don't mix runtimes in one process.** Evaluating an MLX teacher and a torch student in the *same* Python process conflicts on Apple Silicon (`'array' object has no attribute 'device'`). Run them as separate invocations. Found that one the fun way.
- **Visual‑token budget is a real knob** - too many tokens per screenshot and you blow the context window; cap `max_pixels`.
- **ONNX export** of a full VLM is famously finicky, so I kept torch/MLX inference as the canonical path and shipped a **merge‑and‑save** export instead: fold the LoRA into the base weights and write a standalone 2B student you can load anywhere with plain `transformers`. (ONNX stays a documented stretch goal.)

---

## What the metrics miss (and what I'd do next)

The most useful thing this project taught me wasn't a number - it was *which numbers to distrust*. ROUGE‑L and BLEU against terse human references genuinely undersell a model that writes richer, correct descriptions. If I were taking this past proof‑of‑concept, the very next step would be **LLM‑as‑judge scoring** (the harness already supports it) and **CIDEr**, both of which reward content over brevity‑matching.

**Honest limitations:** small scale (short training, tiny eval N); narrow domain (RICO Android UI); BLEU is low for *everyone* because of the length mismatch; and the headline efficiency numbers are MLX/4‑bit on Apple Silicon, not a server GPU.

**Future work:** cache teacher logits and turn on the soft‑KL term (and finally run the α/T ablation); add feature alignment; grow the data with teacher‑labelled RICO; a full‑scale run on a 24 GB GPU; and the natural next domain step - **grounding** (bounding boxes) and an **agent wrapper**.

---

## Reproduce it yourself

```bash
git clone https://github.com/P0rt/vlm-distill-screenshots && cd vlm-distill-screenshots
uv sync --extra data            # data stack
uv run vlm-build-dataset        # Screen2Words → unified {image, prompt, target}

uv sync --extra mlx             # Apple Silicon teacher
uv run vlm-teacher-label --limit 200

uv sync --extra ml              # transformers + peft
PYTORCH_ENABLE_MPS_FALLBACK=1 uv run vlm-train --limit 200
uv run vlm-eval --models student,baseline --adapter results/checkpoints/<hash> --limit 100
uv run vlm-benchmark --models teacher,student
```

Everything - configs, the metric implementations, the plots, this article - is in the repo.

## Links

- **Code:** <https://github.com/P0rt/vlm-distill-screenshots>
- **Model + card:** <https://huggingface.co/p00rt/qwen2-vl-2b-screenshots-distill>
- **Dataset:** <https://huggingface.co/datasets/rootsautomation/RICO-Screen2Words>

If you've done VLM distillation and have a take on metrics that actually reward rich descriptions, I'd love to hear it in the comments.
