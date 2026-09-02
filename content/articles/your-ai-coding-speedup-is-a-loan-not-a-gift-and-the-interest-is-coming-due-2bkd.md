---
title: 'Your AI Coding Speedup Is a Loan, Not a Gift - and the Interest Is Coming Due'
slug: >-
  your-ai-coding-speedup-is-a-loan-not-a-gift-and-the-interest-is-coming-due-2bkd
description: >-
  Companies spend 44 cents of every AI-token dollar fixing bugs the AI itself
  wrote. The speedup is real - but it's borrowed against future maintenance.
  Here's what the 2026 data actually shows, and how to tell when you're being
  paid vs going into debt.
published: true
date: '2026-06-03T13:37:19Z'
updated: '2026-06-03T13:37:19Z'
readingTime: 6
tags:
  - ai
  - productivity
  - programming
  - webdev
language: en
coverImage: ''
source: dev
sourceUrl: >-
  https://dev.to/p0rt/your-ai-coding-speedup-is-a-loan-not-a-gift-and-the-interest-is-coming-due-2bkd
devId: 3811550
canonicalUrl: >-
  https://sergei-parfenov.com/blog/your-ai-coding-speedup-is-a-loan-not-a-gift-and-the-interest-is-coming-due-2bkd/
---

There's a number going around that should bother you more than it does: for every dollar companies spend on AI coding tokens, a large chunk goes straight back into fixing the bugs that same AI produced. The speedup is real - I feel it every day, I'm not here to tell you AI coding is fake. But "faster" and "cheaper" are not the same word, and 2026 is the year the bill started arriving.

> **TL;DR** - AI doesn't give you a productivity gift, it gives you a *loan*: speed now, paid back later in debugging, review, and rewrites. Reporting around an Entelligence AI figure puts the "interest" at roughly 44 cents of every token dollar going to fixing AI-generated bugs. The loan is still worth taking - for the right tasks. The trap is spending borrowed time like it's income.

## The number

The stat that kicked this off: a widely-shared claim from Entelligence AI, reported across tech press, that companies spend about **44% of their tokens fixing bugs their own AI generated.** The fuller breakdown making the rounds is even starker - for every $1 of token spend, ~$0.44 goes to bug fixes, ~$0.27 to rewriting AI output, ~$0.11 to review and merge delays. The pitch version: spend $100k on tokens, ~$18k reaches stable production.

Now - important caveat, because this is exactly the kind of number that goes viral and then turns out to be junk. Entelligence sells reliability tooling, so that figure is self-serving. Treat the precise percentage as marketing until independently replicated. But it doesn't stand alone:

- CodeRabbit (also self-interested, also worth salting) analyzed ~470 open-source PRs and found AI-generated code produced **~1.7× more issues** than human code - and a higher share of *critical* ones.
- Independent researchers at Singapore Management University concluded in April that AI-generated code can introduce **long-term maintenance costs** into real projects - no tool to sell.
- Uber reportedly burned its entire 2026 AI budget in four months, with its COO saying the spend was getting "harder to justify" against measurable output.

Different sources, different incentives, same shape: **the code ships faster, the bugs arrive later, the maintenance compounds.** That's not a gift. That's a loan.

## Why "loan" is the right metaphor (and "gift" is the dangerous one)

A gift is free. You take it, you're ahead, done. A loan gives you something valuable *now* in exchange for an obligation *later* - and whether it was smart depends entirely on what you did with the principal and what the interest rate turns out to be.

The viral framing I keep coming back to is the maintenance argument: if you write code twice as fast but didn't also halve your maintenance cost, you haven't gained anything durable - you've traded a one-time speed boost for a permanent obligation. Velocity on the front end, debt on the back end.

Here's why the gift framing is actively dangerous: **you book the speedup immediately and visibly** (PR merged, feature shipped, manager happy), but **you pay the interest later and diffusely** (a 2am incident, a confusing module nobody can safely change, a security review that finds the thing six months on). The benefit is loud and the cost is quiet - so teams systematically over-borrow, because the books *look* like pure profit right up until they don't.

This is the same structural failure I keep running into in production AI systems generally: the win is the part everyone measures, the cost is the part nobody instruments until it bites.

## The productivity-perception trap

There's a second number that pairs with the first, and it's the uncomfortable one.

METR ran a study in 2025 where experienced open-source developers did real tasks with and without AI. The developers *believed* AI sped them up by ~20%. Measured, the early result went the other way - they were slower, because the time saved typing got eaten by finding and fixing errors, steering the model, and waiting on it.

**Now - I have to be fair about this, because the METR story is more nuanced than the headlines.** METR's own February 2026 update walks the dramatic version back: they found heavy selection bias (when they tried to re-run it, 30-50% of devs *refused to work without AI even for a paid study* - itself a wild finding), and their newer, larger cohort showed roughly a -4% effect with a confidence interval spanning negative to positive. So the honest read isn't "AI makes you 19% slower." It's the softer, harder-to-dismiss version: **the perceived speedup is consistently larger than the measured one.** People feel 20% faster; the data says somewhere between "a little slower" and "a little faster."

That gap is the whole problem. If you *feel* twice as productive but you're roughly break-even, and meanwhile 44 cents on the dollar is leaking into rework - you will confidently make staffing, deadline, and architecture decisions based on a productivity gain that isn't there. The feeling is the interest rate you can't see.

## So when is the loan worth taking?

Here's where I part ways with the doomer takes, because I use these tools every day and the answer is obviously not "stop." It's "borrow deliberately." The pattern I've landed on, watching where AI pays off versus where it quietly bills me:

**Good loans (low interest, take them all day):**

- **Throwaway and boilerplate** - scaffolding, config, one-off scripts, glue code. There's no maintenance tail to pay back because the code barely has a future.
- **Code you'd have to look up anyway** - the API you use twice a year, the regex, the bash incantation. AI replaces the doc-diving, not the thinking.
- **Stuff you can fully verify cheaply** - pure functions with obvious tests, transformations where wrong is immediately visible.

**Bad loans (the interest eats the principal):**

- **Core domain logic you'll maintain for years** - every line is a future obligation, and AI is happy to write code that *looks* right and is subtly, expensively wrong.
- **Anything security-sensitive** - auth, input handling, anything touching secrets. The reported critical-bug skew is worst exactly here.
- **Code in a domain you don't understand well enough to review** - if you can't catch the subtle wrong, you're not reviewing, you're rubber-stamping a loan you can't read the terms of.

The dividing line is brutally simple: **how expensive is this code to be wrong, and how cheaply can I verify it's right?** Cheap-to-verify, low-maintenance → free money, use AI aggressively. Expensive-to-be-wrong, long-lived → that's where the 44% lives, and where "I wrote it twice as fast" is a sentence you'll regret.

## The one habit that changes the math

If I had to compress it to a single practice: **measure the interest, not just the principal.** Teams obsessively track AI's upside (lines generated, tickets closed, "tokenmaxxing" leaderboards - Amazon reportedly killed one internal leaderboard after people gamed it by burning tokens for the score). Almost nobody tracks the downside in the same ledger: what fraction of incidents trace to AI-written code, how much review time it consumes, how often it gets rewritten within N weeks.

Until you put both columns on the same page, every AI speedup looks like pure profit - for exactly the same reason a credit card feels like free money until the statement comes. The tool isn't the problem. Mistaking the loan for income is.

The speedup is real. Just don't spend it twice.

---

*I'm genuinely curious where people land on this: in your experience, is AI a net productivity gain once you count the rework - or does the maintenance tail eat it? And has anyone actually put both columns in the same ledger? Would love to see real numbers in the comments, not vibes.*

### Sources

- ["Coders are refusing to work without AI - and that could come back to bite them,"](https://techcrunch.com/2026/05/29/coders-are-refusing-to-work-without-ai-and-that-could-come-back-to-bite-them/) TechCrunch (May 2026).
- ["Developers won't work without AI anymore. The research says it might be making them worse,"](https://thenextweb.com/news/developers-refuse-work-without-ai-coding-productivity-paradox) The Next Web (May 2026).
- METR, ["We are Changing our Developer Productivity Experiment Design"](https://metr.org/blog/2026-02-24-uplift-update/) (Feb 2026) - the selection-bias update and revised effect size.
- METR, ["Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity"](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) (Jul 2025) - the original perception-vs-measurement result.
- CodeRabbit AI code-quality analysis, reported via [Futurism/Yahoo](https://uk.news.yahoo.com/ai-code-bug-filled-mess-150000962.html) (2026).
