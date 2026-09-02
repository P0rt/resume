---
title: >-
  'World Models' Will Be the Next Buzzword. The Man Saying That Just Raised $1B
  to Build One
slug: >-
  world-models-will-be-the-next-buzzword-the-man-saying-that-just-raised-1b-to-build-one-4oih
description: >-
  In March, the CEO of a research lab with zero products closed a $1.03 billion
  seed round - the...
published: true
date: '2026-07-24T12:10:03Z'
updated: '2026-07-24T12:24:46Z'
readingTime: 8
tags:
  - ai
  - machinelearning
  - llm
  - robotics
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fpq9qz84u700p3rvd77rt.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/world-models-will-be-the-next-buzzword-the-man-saying-that-just-raised-1b-to-build-one-4oih
devId: 4223777
canonicalUrl: >-
  https://sergei-parfenov.com/blog/world-models-will-be-the-next-buzzword-the-man-saying-that-just-raised-1b-to-build-one-4oih/
---

In March, the CEO of a research lab with zero products closed a **$1.03 billion seed round** - the largest in European history. Then he told TechCrunch that "'world models' will be the next buzzword," predicting that within six months every company would slap the label on itself to raise money.

The CEO is Alexandre LeBrun. The lab is AMI Labs, Paris. The chairman is Yann LeCun. And LeBrun was right on schedule: VCs have pushed roughly **$3B into the category** since.

When the person behind the biggest bet in a space tells you the space is about to become a content-free buzzword, that's the frame worth keeping. The question isn't whether "world model" gets diluted - it will. The question is whether there's a real, testable architectural disagreement underneath the label.

There is. This post is the paper trail: what LeCun is actually claiming, what the published results show, who paid for it, and the strongest arguments that the whole thesis is wrong.

## Who is LeCun, in 30 seconds

Turing Award 2018 (shared with Hinton and Bengio). Architect of convolutional neural networks. Chief AI scientist at Meta from 2013, where he built FAIR into one of the largest industrial research labs on the planet. His departure was confirmed in November 2025, after Meta folded FAIR into its new superintelligence org, spent $15B on Scale AI, and reoriented around Llama and generative products.

The split was architectural, not financial. Meta isn't investing in AMI Labs - but the two keep a research partnership around the architecture this whole story runs on.

## The case against LLMs, as he makes it

LeCun's critique predates the current hype cycle by years, and it's more specific than "LLMs bad." His standard list of what's missing: **understanding of the physical world, persistent memory, reasoning, and planning.** The supporting arguments:

- **Autoregression compounds errors.** Every generated token conditions on possibly-wrong previous tokens. Fine for prose. Bad for long-horizon plans, where one early mistake invalidates everything downstream.
- **Text is a thin slice of reality.** By his estimate, a four-year-old has taken in more raw sensory data through vision alone than the largest text corpora contain. Text *describes* the world; it doesn't contain its dynamics.
- **The falling pen.** Drop a pen and it can land many ways. A system predicting one most-likely continuation in surface space is doing a different computation than one reasoning over a distribution of physical outcomes.
- **The stakes argument.** LeBrun ran Nabla, a medical AI company, and arrived at the same place from the applied side: in healthcare, hallucination isn't a UX bug. It's a liability category.

At VivaTech this year, LeCun said current chatbots understand the physical world worse than a rat. AMI's corporate framing is more measured: token prediction works well for discrete, low-dimensional tasks - retrieval, summarization, code - and *mimics* intelligence without modeling the world.

One thing worth flagging before we go further: this critique was formulated **before RL-trained reasoning models existed.** The "no reasoning, no planning" claim is weaker in 2026 than it was in 2022. The honest version of the argument today is about the *reliability and grounding* of that reasoning - not its existence.

## "World model" currently means three different things

This is the part most coverage skips, and it's where the buzzword damage will happen. At least three technically distinct approaches share the label:

1. **Generative video prediction.** Predict future frames, conditioned on actions. Google DeepMind's **Genie 3** generates navigable 3D worlds at 24fps; NVIDIA's **Cosmos** (launched at CES 2025, 2M+ downloads, trained on ~20M hours of video) targets synthetic data for robotics and AVs; Runway's **GWM-1** bets on interactive video. The model's imagination is literally watchable.
2. **Explicit 3D representation.** Fei-Fei Li's **World Labs** treats the world as a spatial object, not a frame sequence. Marble (shipped November 2025) generates 3D environments on Gaussian splats plus physics engines, viewable in VR.
3. **Latent-space prediction.** **JEPA** - LeCun's bet. Don't generate pixels at all. Encode observations into abstract representations and predict how *those* evolve. The claim: most pixel-level detail is irrelevant for planning, and predicting it wastes capacity and compute.

These are not interchangeable. They differ in what they predict, how you evaluate them, and what they're for. When a startup calls itself a "world model company," the first useful question is *which of the three it means.*

## The paper trail: what JEPA has actually shown

The fundraise is loud. The papers are quieter and more interesting.

**2022 - the position paper.** *A Path Towards Autonomous Machine Intelligence* lays out the whole program: a modular agent (perception, world model, cost, actor, short-term memory, configurator) with JEPA as the learning substrate. No results - pure architecture. It reads as a research roadmap, and AMI Labs is essentially this paper incorporated.

**2023 - I-JEPA.** Images. Mask blocks of an image, predict the *representations* of the masked regions from visible context - never reconstruct pixels, no handcrafted augmentations. Meta reported training a ViT-Huge in under 72 hours on 16 A100s, a fraction of what pixel-reconstruction methods burn, with strong linear-probe results.

**2024 - V-JEPA.** Same trick on video: masked latent prediction over spatiotemporal patches. The representations turn out to encode *motion* unusually well - exactly what pixel-reconstruction models are notoriously mediocre at.

**2025 - V-JEPA 2.** The load-bearing result. A ~1B-parameter ViT-g encoder trained on 22M videos (over 1M hours). From the paper:

- **77.3% top-1 on Something-Something v2** (motion understanding)
- **39.7 recall@5 on Epic-Kitchens-100** action anticipation - a 44% relative improvement over prior task-specific models
- Aligned with an 8B language model: **84.0 on PerceptionTest, 76.9 on TempCompass** - state of the art at that scale

Then the robotics part, **V-JEPA 2-AC**: take the frozen encoder, post-train an action-conditioned predictor on **less than 62 hours** of unlabeled robot video from the open DROID dataset, and deploy zero-shot on Franka arms in two labs the model never saw. Planning runs as model-predictive control in latent space. Results: **65-80% success on pick-and-place with unseen objects** - no rewards, no task-specific data, no data from the deployment robots. Planning takes **~16 seconds per action versus ~4 minutes** for the video-generation baseline (Cosmos), and on a cup-relocation task it hit ~80% where the vision-language-action baseline Octo managed 15%.

Meta also released physical-reasoning benchmarks alongside (IntPhys 2, MVPBench, CausalVQA) - on which current models, LLMs included, still trail humans badly. That gap is the entire pitch.

**2026 - AMI Labs.** As of July: no public model. Reporting points to work on world models that adapt continually through action, plus the conference-keynote circuit. LeBrun's stated timeline: roughly a year to the first usable pieces in a product, *years* to real commercial applications - healthcare (via Nabla), robotics, wearables, industrial. LeCun says year one is research. Credit where due: they are not pretending otherwise.

## The money map

The AMI round was led by Bezos Expeditions, Cathay Innovation, Greycroft, Hiro Capital and HV Capital, with NVIDIA, Temasek, Samsung and Toyota Ventures in, plus individuals including Bezos, Mark Cuban, Eric Schmidt and - unusually for a seed round - Tim Berners-Lee. They initially sought €500M and closed ~€890M.

Zoom out and the pattern sharpens. **World Labs** raised $1B in February at $5.4B post. **Decart** took $300M in May at $4B (Karpathy is an angel). **Odyssey** raised $1.2B. And NVIDIA is on nearly every cap table - it has committed over **$40B in AI equity in 2026**, frequently structured as equity in exchange for long-term GPU commitments.

Read that incentive carefully. NVIDIA's omnipresence is evidence that world models are *compute-hungry*, not that the architecture is right. Demis Hassabis calling world models essential for AGI is the more meaningful endorsement - DeepMind builds them regardless of the hype cycle, and has no fundraise to justify.

## The honest counterarguments

I don't want to write the version of this post that just relays the pitch. Here's the strongest case against.

**1. LLMs may already learn world models.** The Othello-GPT line of work trained a transformer on nothing but move sequences and found an emergent, probeable representation of the board state - later shown by Neel Nanda to be *linearly* decodable. Gurnee & Tegmark found linear representations of space and time inside Llama-2, down to individual "space neurons." Next-token prediction demonstrably induces *some* internal model of the data-generating process. So the LeCun claim has to be quantitative - "not enough of one, not grounded enough" - not categorical.

**2. Those internal models might be junk anyway.** Follow-up interpretability work suggests Othello-GPT's "board" may be a bag of correlated heuristics rather than a clean algorithm - epicycles, not an orrery. This cuts both ways: it weakens "LLMs already have world models," and it warns that JEPA latents could look equally messy once someone probes them as hard.

**3. Latent prediction is hard to inspect.** With generative world models you can *watch* what the model imagines and see it break. A JEPA predictor's mistakes live in embedding space; evaluation is indirect - probes, downstream planning success. That's a real tooling and debuggability cost, and part of why the generative camp iterates faster in public.

**4. Nobody's world model is robust yet.** Genie 3 stays coherent for a few minutes and remembers changes for about one. V-JEPA 2-AC does tabletop pick-and-place, not laundry. The gap between "80% cup relocation" and "robot in your kitchen" is the same kind of gap LLMs face between benchmark and deployment. It would be inconsistent to hold only one camp to the deployment standard.

**5. The falsifiability question.** What would count as the thesis *winning*? My candidates: JEPA-style planners beating vision-language-action models on generalization at matched scale; sample-efficiency curves holding beyond manipulation toys; a grounded system measurably hallucinating less in a domain like healthcare. What would count as *losing*: hybrid LLM systems closing the physical-reasoning benchmark gap first. Either outcome is visible within a couple of years - which is more than you can say for most $1B theses.

## What to do with this (if you build things)

Practical, not philosophical:

- **Nothing here replaces your LLM calls in 2026.** The most optimistic insider timeline is a year to first usable pieces, years to products. Plan your stack accordingly and ignore anyone selling you a "world model" API this quarter.
- **Form your own priors hands-on.** V-JEPA 2 checkpoints are public. Cosmos is self-hostable - the 7B variant fits on a single H100 80GB. Marble has a free tier. Genie is a closed preview. An afternoon of poking beats a month of threads.
- **When the label shows up in a pitch deck, ask which of the three architectures it means** - frames, splats, or latents - and where its pick-and-place numbers are. If there's no answer, you've found the buzzword LeBrun warned you about.
- **Watch three markers:** AMI's first release and its license (LeCun spent a decade arguing for open research - the licensing choice will say a lot); whether latent-space planning scales past tabletop manipulation before generative models get long-horizon coherence; and DeepMind shipping a hybrid LLM + world model system, since they own both pieces and have no thesis to defend.

LeBrun's six months are almost up. The benchmarks aren't going anywhere.

## Reading list

- V-JEPA 2 paper: https://arxiv.org/abs/2506.09985
- Meta's V-JEPA 2 announcement + benchmarks: https://ai.meta.com/blog/v-jepa-2-world-model-benchmarks/
- I-JEPA: https://arxiv.org/abs/2301.08243
- The 2022 position paper: https://openreview.net/forum?id=BZ5a1r-kVsf
- AMI Labs raise (TechCrunch): https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/
- Largest EU seed context (Crunchbase): https://news.crunchbase.com/venture/world-model-ai-lab-ami-raises-europes-largest-seed-round/
- The VC map (Forbes): https://www.forbes.com/sites/josipamajic/2026/06/30/world-model-startups-raise-3-billion-vcs-bet-beyond-llms/
- Othello-GPT: https://thegradient.pub/othello/
- Nanda's linear-representation follow-up: https://www.neelnanda.io/mechanistic-interpretability/othello
- Space/time representations in Llama-2: https://arxiv.org/abs/2310.02207
- Melanie Mitchell's skeptical read: https://aiguide.substack.com/p/llms-and-world-models-part-2
