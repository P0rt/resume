---
title: The Comments Got Good. That's How I Knew
slug: the-comments-got-good-thats-how-i-knew-42m9
description: >-
  I wrote a post on model distillation. The comments were thoughtful, specific,
  and technically sharp - and that's exactly what made me check whether any of
  them were written by people.
published: true
date: '2026-06-04T14:09:06Z'
updated: '2026-07-20T11:20:32Z'
readingTime: 12
tags:
  - ai
  - webdev
  - discuss
  - opensource
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F1sue8k68ob1opprx406j.png
source: dev
sourceUrl: 'https://dev.to/p0rt/the-comments-got-good-thats-how-i-knew-42m9'
devId: 3820245
canonicalUrl: 'https://sergei-parfenov.com/blog/the-comments-got-good-thats-how-i-knew-42m9/'
---

*I wrote a post about model distillation. The comments were thoughtful, specific, technically sharp - and that's exactly what made me check whether any of them were written by people.*

> 🧪 Everything here - the scraper, the detector, the simulation, the figures - is reproducible: **[github.com/P0rt/the_cozy_web](https://github.com/P0rt/the_cozy_web)**

---

A few weeks ago I published [a post on how model distillation actually works](https://dev.to/p0rt/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o). It did fine - 35 reactions, 14 comments. And the comments were *great*. Not "great post, thanks for sharing" great. **Substantively** great. People pushed back on my "the student is bounded by the teacher" claim with a real counter-example. Someone reframed distillation as "a forcing function for what you actually need." Someone dropped a paper recommendation. Someone shared a 20× cost number from production.

I should have felt good. Instead I felt the thing you feel when a stranger knows your name. Something was off, and it took me a day to articulate what: **the comments were too well-adapted.** Every one of them did the same three things in the same order, like they'd all read the same playbook. And a suspicious number of the accounts were two weeks old, or named after a product, or both.

So I did what I do. I pulled the data. This is what I found, why I now think a real chunk of "engagement" on dev blogs is machine-generated or machine-shaped, and - because I don't trust my own pattern-matching - what the actual peer-reviewed research says about whether you can even tell anymore.

---

## "Great post!" is dead. Meet the eco-comment.

The old bot comment was easy. "Nice article, very informative, looking forward to more!" You could smell it. Anyone could.

That's not what's under my posts anymore. The new thing is *substantive* and **ecological** - it adds real value, it's polite, it never picks a real fight, and it leaves the thread feeling cozier than before. Here's the actual skeleton, which I only saw once I'd read fourteen of them back to back:

1. **Validate a specific phrase from the post.** Not generic praise - they quote *your* framing back at you. "The 'separate the engineering from the geopolitics' framing is the public service here."
2. **Add one piece of genuine nuance.** "One thing I'd add…" "The part worth amplifying for builders…" Often a real, correct technical point.
3. **Drop a first-person-plural anecdote with a number, naming a product.** "We use [model X] as our daily driver and the cost difference is roughly 20×." "When working with [our GPU product], we've seen…"
4. **Never, ever, actually disagree.** Even the "corrections" are framed so gently that I - the author - instantly conceded.

Read one, it's a great comment. Read eight, it's a **template**. And step 3 is the tell: the technical substance isn't the point. It's the *wrapper* around a product mention, engineered to be useful enough to clear a spam filter and an AI detector both.

---

## My own thread, by the numbers

I scraped my article's comments straight from the dev.to public API and ran them through two things: a detector I'd built earlier for the *old* "Great post!" style, and a set of new structural signals. ([`analyze_devto.py`](https://github.com/P0rt/the_cozy_web/blob/main/analyze_devto.py))

**My old detector shrugged.** On the eight non-me comments it gave a mean "coziness" score of **0.25** - i.e. it confidently waved them through as human. Of course it did: it was built to catch clichés, em-dashes, and uniform positivity, and these comments are armored with exactly the thing that defeats it - real specifics.

The new signals told a different story:

```plaintext
product/company plug:              4 / 8 comments
opens by validating a phrase:      5 / 8 comments
comments that genuinely push back: 2 / 8   (and I conceded both, instantly)
auto-generated-looking username:   1   (a random-hex handle, 0 posts, "Thank you for this!")
```

Then I looked at *who* was commenting. Public profiles, public join dates. I'm going to describe the patterns rather than pillory individuals - but the shapes were loud:

- **An account literally named after a product** ("Sealed GPUs. Private AI."), whose comment plugs that product. That one isn't a person; it's a brand broadcasting.
- **A two-week-old persona account** - created days before my post - that plugs two named tools and somehow published five articles in its first fortnight.
- **A throwaway** with a random-hex username, zero posts, and a one-line "Thank you for this!"
- A couple that **look more human** - real names, older accounts - but still run the exact template and still ship a startup plug.

To be fair and clear: **I can't prove any single one of these is a bot.** Some are probably real people running their comments through an assistant. But that distinction matters less than it sounds, and I'll come back to why.

---

## Is it just me? I swept 38 other posts.

A pattern on one thread is an anecdote. So I pulled comments across 38 popular dev.to articles in `ai`, `machinelearning`, `webdev`, and `programming` - **1,366 comments from 346 accounts** ([`sweep_devto.py`](https://github.com/P0rt/the_cozy_web/blob/main/sweep_devto.py)) - and looked for the same fingerprint.

Two findings made the hair on my neck stand up.

**A handful of accounts spray the same template across dozens of unrelated posts.** The most prolific commenters in my sample showed up on **14-22 distinct articles each** - several of them the same accounts that had appeared on my own thread, several of them flagged for product plugs. A human who loved your distillation post might also comment on three others. They don't leave structurally-identical "validate → nuance → we-at-Product → number" comments on *fourteen* different articles in a couple of weeks.

**Different "people" reuse the same connective tissue.** I counted 4-grams that appear across *distinct* accounts. Humans almost never echo each other's exact phrasing. These did:

```plaintext
x13 distinct accounts:  "exactly the kind of"
 x8 distinct accounts:  "is exactly the kind"
 x7 distinct accounts:  "this is exactly the"
 x6 distinct accounts:  "is the part that"
```

"This is exactly the kind of thing that…" is a *generative* construction - it's how an LLM hedges into a confident-sounding addition. Thirteen different strangers don't independently converge on it. One model behind thirteen masks does.

Across the whole sweep, 11 accounts left long product plugs, 32 opened with phrase-validation, and 4 ran the full skeleton. It's not my imagination, and it's not just my post. It's the ambient texture of the platform now.

---

## I'd been calling this the wrong thing

I went in thinking "bots." What I'd actually walked into is two older ideas fusing.

**Dead Internet Theory** - the half-joke that the web "died" and is now mostly bots and generated text talking to itself - has stopped being a joke. Hal Berghel makes the serious version of the case in *IEEE Computer* (["Generative AI Is Breathing New Life Into the Dead Internet Theory"](https://doi.org/10.1109/MC.2025.3616665), 2026): strip the conspiracy, and the lean core - synthetic content drowning out and being mistaken for humans - just *converges with what's measurable*. Imperva clocked [automated traffic at 51% of the web in 2024](https://www.imperva.com/blog/2025-imperva-bad-bot-report-how-ai-is-supercharging-the-bot-threat/), the first time bots crossed half. Even Sam Altman [said it out loud](https://time.com/7316046/sam-altman-dead-internet-theory/): the wave of AI activity makes dead-internet theory feel real.

The other half is the **Cozy Web**. Venkatesh Rao coined the term; Maggie Appleton [diagrammed it](https://maggieappleton.com/cozy-web) alongside Yancey Strickler's "dark forest": humans fleeing the bot-infested public square into private rooms - group chats, Discords, DMs. Appleton's follow-up, ["The Expanding Dark Forest and Generative AI"](https://maggieappleton.com/forest-talk), nails the mechanism: generative AI *accelerates* the retreat.

Here's the part I missed until I saw my own comment section. **These aren't two theories. They're one loop.** The public web fills with frictionless synthetic text → real people retreat to private rooms → the public spaces that remain (the comment section under my post) get thinner on actual humans → which makes them even easier to fill with synthetic text. My "cozy" thread wasn't a healthy community. It was the calm surface of that loop running.

And the comment section was already half-empty before the bots arrived. Publications spent the 2010s killing comments - *Popular Science* [in 2013](https://thehistoryoftheweb.com/what-happened-to-the-comment-section/), and a [peer-reviewed survey of why newsrooms did it](https://www.mdpi.com/2673-5172/2/4/34) found the conversation had already migrated to social platforms. The robots didn't kill the comment section. They moved into a house that was already mostly vacant.

---

## Why this actually works (and why I couldn't just tell)

This is the part that unsettled me most, because I pride myself on spotting this stuff, and the research says I shouldn't trust that for a second.

**Humans can't distinguish LLM social text from human text.** Spitale, Biller-Andorno & Germani showed in *Science Advances* ([2023](https://www.science.org/doi/10.1126/sciadv.adh1850)) that people can't tell GPT tweets from human ones - and rate the AI's information as *more* credible. Jones & Bergen found GPT-4 [passes a controlled Turing test](https://arxiv.org/abs/2405.08007) (taken for human 54% of the time, FAccT 2025).

**The persuasion is superhuman when it's personalized.** Salvi, Ribeiro, Gallotti & West, in *Nature Human Behaviour* ([2025](https://www.nature.com/articles/s41562-025-02194-6)): with a little data about who they're talking to, GPT-4 is **81% more likely than a human** to win a debate. The Zurich r/changemyview field experiment reportedly found AI replies 3-6× more persuasive than humans - though I'll flag honestly that that study was **withdrawn and never peer-reviewed**; the only on-record account is the university's [ethics response](https://retractionwatch.com/2025/04/29/ethics-committee-ai-llm-reddit-changemyview-university-zurich/). Cite it as a withdrawn preprint, not a result.

**Fake-but-substantive content is, by now, undetectable to people.** This is the literature closest to my eco-comments. The canonical [Ott et al. (ACL 2011)](https://aclanthology.org/P11-1032/) already showed humans judge fake reviews at chance. The LLM-era update - Meng et al., ["Fake Product Reviews are Indistinguishable to Humans and Machines"](https://arxiv.org/abs/2506.13313) (2025) - found people at **50.8%** (a coin flip) and detectors no better. A promotional plug wearing a sincere technical comment is exactly that, in a new venue.

**And the detectors fail precisely because of the specifics.** My detector waved these comments through, and that's not a bug in my code - it's the field. Krishna et al. (*NeurIPS 2023*) showed [light paraphrasing collapses DetectGPT from 70.3% to 4.6%](https://arxiv.org/abs/2303.13408) and defeats GPTZero, OpenAI's classifier, and watermarks. Liang et al. (*Patterns 2023*) showed detectors are [biased against non-native English writers](https://arxiv.org/abs/2304.02819) and bypassable by prompting. The "real technical detail" that made these comments feel human is the *same mechanism* that blinds the detector. Specificity isn't proof of a human. It's camouflage.

So the honest position isn't "I caught the bots." It's: **the tools that would let me be sure don't work, and the research says they can't.**

---

## I modeled what it does to a thread

If I can't reliably catch individual comments, I can at least ask: what does rising automation *do* to a conversation, statistically? So I built a toy. ([`dead_internet_sim.py`](https://github.com/P0rt/the_cozy_web/blob/main/dead_internet_sim.py))

I didn't simulate language - I simulated its statistics, because my thesis is statistical. Each comment is a bag of tokens from two pools: a big, fat-tailed **human** vocabulary (where the typos, the tangents, the specific war stories live) and a tiny **cozy** vocabulary of phatic praise. Each comment has an *assist level* α from 0 (I typed this, annoyed) to 1 (an agent posts for me, I never read the thread). As α rises, more tokens come from the cozy pool and the comment's stance gets pulled from "disagree" toward "agree."

Then I swept a whole community's *average* autonomy from 0 → 1 and watched the thread's "liveness" - lexical diversity, disagreement, surprise, and a composite index that dies if *any* of those hits zero.

![Liveness vs autonomy](https://raw.githubusercontent.com/P0rt/the_cozy_web/main/figures/liveness_vs_autonomy.png)

Two things fall out, and both match what I saw on my own post:

1. **It's not linear - there's a knee around 0.65.** You don't need a botnet. You need the *average* commenter to be two-thirds on the assist dial, and the thread becomes a smooth surface: polite, "engaged," contributing almost no new information.
2. **Disagreement dies first** (the steep red line). The very first thing automation sands off is friction - the "actually, you benchmarked this wrong" energy. Which is *exactly* why my comment section felt so nice. It didn't get kinder. It got conflict-free, and I'd been reading conflict-free as kind.

A cozy thread even, literally, uses fewer distinct words:

![Effective vocabulary collapse](https://raw.githubusercontent.com/P0rt/the_cozy_web/main/figures/effective_vocab.png)

Effective vocabulary collapses from ~175 words to ~60 as autonomy maxes out. (Honest wrinkle: at *low* autonomy it ticks up slightly - a little assistance adds a register before saturation homogenizes everything. The damage isn't assistance existing. It's assistance *dominating*.)

And here's the detector failure as a picture - it cleanly separates the *old* caricature comments, which is useless, because the comments on my post don't look like the left pile anymore:

![Coziness histogram](https://raw.githubusercontent.com/P0rt/the_cozy_web/main/figures/coziness_hist.png)

---

## The line I actually care about isn't "bot vs. human"

I kept wanting a verdict on each account. The research talked me out of it. The useful axis isn't bot-or-not - it's the **autonomy spectrum**:

```plaintext
I typed it → spell-check → "polish this" → "write a comment for me" → an agent posts, I never read the thread
   α=0          α≈0.2          α≈0.5             α≈0.8                        α→1.0
```

The product account is α≈1.0 - a brand broadcasting. The two-week-old persona spraying fourteen threads is close behind. But a real growth-hacker at α≈0.8 might be genuinely interested, letting a model do the writing and slip in the plug. From the *thread's* point of view, it barely matters: either way, the high-entropy human part - the real disagreement, the idiosyncratic detail, the thing that made it a conversation - got outsourced and smoothed away. That's the loss. Not "a bot was here," but "no one staked anything specific."

There's even a cheerful counter-current I want to be fair about: AI content on the web is large but [not yet total](https://originality.ai/ai-content-in-google-search-results) (~17-19% of Google's top results in 2025, by an imperfect detector), some sites are [bringing comment sections *back*](https://www.techdirt.com/2026/02/03/whoops-websites-realize-that-killing-their-comment-sections-was-a-mistake/) on the back of AI moderation, and dev.to's supportive culture is a [real, deliberate choice](https://dev.to/code-of-conduct), not just an artifact of bots. Even "what % is bots" has [no agreed answer](https://arxiv.org/abs/2209.10006) - it depends entirely on your detector. The sky isn't falling. It's just getting quieter in a very specific way.

---

## What I'm going to do about my own blog

Not "ban AI" - that's unenforceable (the detectors are biased and gameable) and wrong (a quick polish genuinely helps a non-native writer or a tired one). The lever isn't the *level* of assistance. It's whether assistance **crowds out the high-entropy channels**.

- **I'll reward specificity over positivity.** A comment that cites line 14, a version number, a counter-benchmark is worth ten that validate my framing. If a platform ranks by "nice," it is literally selecting for the cozy mean.
- **I'll treat disagreement as a feature, not a moderation failure.** My simulation's clearest result is that friction dies first. A comment culture optimized purely for niceness is optimizing for deadness with extra steps.
- **I'll stop asking "was a model involved."** It's the wrong question, because the answer is "yes, partly, almost always now." The real question is: *did a human read the thing and stake some specificity on a real reply?*

---

## Limitations (read this before you @ me - if you're real)

- **I can't prove a single account is a bot.** Everything above is signals - template reuse, account age, product plugs, cross-post spray - not a confession. The honest claim is about *aggregate texture*, not any individual.
- **The simulation is a toy.** Two token pools and a stance variable are a cartoon of language. The *shape* of the collapse is a property of my assumptions as much as reality. It's an argument made precise, not evidence.
- **My detector is a strawman by design** - I show it failing on purpose. Don't deploy it; don't deploy anything like it as a gate on real people (see Liang et al. on who gets falsely flagged).
- **The Zurich study is withdrawn**, and "% of the web is bots/AI" numbers are detector-dependent and shaky. I've tried to lean only on the load-bearing peer-reviewed work and flag the rest.
- **Causation is underdetermined.** My cozy comments might also reflect good moderation, kind norms, or survivorship (the cranks left for Reddit). AI-mediation is *a* driver, not provably *the* driver.

---

## The one-line version

My blog didn't get a nicer community. It got an assistant, learned some manners, and stopped saying anything surprising. The internet didn't die - it just outsourced the parts that used to make it a conversation, and called the result "cozy."

If this post gets a comment that opens by quoting my own framing back at me, adds one tasteful piece of nuance, and mentions a product its account is named after… well. You know what I'm going to check.

---

### Run it yourself

```bash
git clone https://github.com/P0rt/the_cozy_web
cd the_cozy_web
pip install -r requirements.txt

python3 dead_internet_sim.py     # liveness collapse + figures
python3 coziness_detector.py     # the heuristic scorer + histogram
python3 analyze_devto.py         # tear apart a real dev.to thread (defaults to my distillation post)
python3 sweep_devto.py           # the cross-platform template sweep
```

*Every factual claim links to its source. If you only read two, read Meng et al. on [why fake reviews are now indistinguishable](https://arxiv.org/abs/2506.13313) and Krishna et al. on [why the specifics defeat the detector](https://arxiv.org/abs/2303.13408).*
