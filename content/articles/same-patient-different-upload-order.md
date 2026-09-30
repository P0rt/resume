---
title: "Same Patient, Conflicting Documents: Can AI Preserve the Evidence?"
slug: "same-patient-different-upload-order"
description: "A synthetic experiment for Symptomato shows how an omitted source can hide a conflict, even when the final accepted value is correct."
published: true
date: "2026-09-30T09:09:19Z"
updated: "2026-09-30T09:48:18Z"
tags:
  - "ai"
  - "machinelearning"
  - "benchmarking"
  - "healthtech"
language: "en"
source: "local"
sourceUrl: ""
canonicalUrl: "https://sergei-parfenov.com/blog/same-patient-different-upload-order/"
coverImage: "https://sergei-parfenov.com/assets/chartreplay-same-patient-different-upload-order.png"
coverAlt: "An archivist compares two records for the same patient as identical documents arrive in different orders, leaving one record neatly assembled and the other disordered."
---

## What I Benchmarked

A patient uploads a laboratory report, an older discharge summary and a photograph of a prescription. A correction arrives later. The same report appears twice. One note describes the patient's mother; another says a diagnosis is suspected. The dates inside the documents do not follow the order in which the files arrived.

For the person reviewing that history, a clean summary is only useful if it has preserved the evidence. Which source supports this value? Was it corrected? Do two documents disagree? Does this statement concern the patient? What remains unknown?

I'm a technical consultant at [Symptomato](https://symptomato.com), where AI gathers context before a human health specialist joins the conversation. For Symptomato, we are building a way to turn incoming documents into a longitudinal record that can answer those questions. **ChartReplay** is the experiment I built to test the integrity of that process.

The most revealing failure was a disagreement that disappeared. The model missed a value in one source. When a second source reported a different value for the same event, the constructed record contained only the second value, marked accepted. A later correction produced the expected accepted value, but the original evidence was still missing.

The record looked more settled because it contained less information.

### Trust starts with knowing what the record can establish

There are two different questions here. Did the system preserve what the documents actually said? And are those documents themselves accurate accounts of what happened to the patient?

This experiment tests the first. A faithful record can still contain an erroneous report, a mistaken patient recollection or unresolved disagreement. Establishing authenticity and medical accuracy requires evidence and review beyond this benchmark. The system should expose those questions rather than silently answer them through a confident rewrite.

In ChartReplay, **accepted** is a state under explicit record-merging rules. It does not mean independently verified, clinically current or true in the world. A statement can be accepted because no visible source disputes or supersedes it. If we lose a conflicting source, that state can become misleading.

Provenance makes such decisions inspectable. [FHIR's Provenance resource](https://hl7.org/fhir/R4/provenance.html) describes how information was created or revised and which entities and agents were involved. ChartReplay is not a FHIR implementation, but the relevant principle is the same: the record needs an inspectable relationship to its sources.

### The record has to preserve relationships, not just values

I defined a source contract before running the models. It specifies what should survive an update:

| What arrives | What the record must preserve |
|---|---|
| Two different values for the same documented event | Both assertions and the unresolved conflict; upload order does not choose a winner |
| An explicit correction | The corrected assertion, its links to the originals, and the originals as superseded history |
| A repeat upload | The existing assertion, without inventing another measurement |
| A later independent measurement | A separate event, not a correction of the earlier one |
| A family-history statement or suspected diagnosis | The correct subject and the stated uncertainty |
| A medication order or an absent entry | What the source states, without inferring medication consumption or an explicit negative |

For example, a prescription does not establish that someone took a medication. An absent allergy entry does not establish that the patient denied allergies. These distinctions follow the source semantics described by [FHIR MedicationRequest](https://hl7.org/fhir/R4/medicationrequest.html) and [AllergyIntolerance](https://hl7.org/fhir/R4/allergyintolerance.html).

Every retained assertion is checked against its supporting source, including subject, event time, value, uncertainty and correction relationships. A citation to an unrelated document does not count. The evaluation includes superseded assertions and unresolved conflicts, not just whichever value appears last.

### Testing one part of the upload problem under controlled conditions

The model pilot uses **ten self-authored synthetic histories**, one from each logical family. It covers corrections, conflicts and reconciliation, family attribution, uncertainty, medication orders, duplicate versus independent events, time offsets, similar-looking sources, multi-assertion notes and longer histories.

Each history is delivered chronologically, in a seeded shuffle and with duplicate replays, with two repetitions of each schedule. The unique source set is the same when delivery finishes. At intermediate checkpoints, the expected record is reconstructed from only the sources received so far: a system cannot act on a correction it has not received.

These are controlled text fixtures with explicit source and event identifiers. They isolate the update problem; they do not reproduce all the difficulty of the opening upload scenario. No photographs, OCR or unrestricted clinical prose enter this pilot. Most documents contain one assertion. A deterministic parser written for the known grammar passes the calibration set without an LLM.

The broader fixture generator contains 120 cases, 1,020 documents and 1,092 assertions. The model results below use the ten pilot histories, not all 120 cases. Repeated episodes are not independent patients.

### Three ways to maintain the same history

**Full rebuild** asks the model to construct the whole chart again from all available originals.

**Rolling rewrite** gives it the previous chart, new documents and the complete available archive, and asks for an updated chart.

**Extract plus ledger** asks the model to extract assertions from newly delivered documents. Deterministic software then applies the declared correction and conflict rules.

The third design has an important constraint: its prompt explicitly prohibits re-extracting archive-only documents. Rebuild and rewrite can recover an earlier omission by reading the originals again. The extractor can see the archive for context, but does not revisit old documents for extraction unless they are delivered again. There is no separate completeness check before the ledger accepts an extraction.

This is a comparison of those particular update policies, including that asymmetry. It does not establish the performance of every ledger-based design. All three can retain the full history without an imposed chart-size budget; provider context and response limits still apply. Each call starts a fresh conversation.

## Models Tested

The primary comparison uses the complete saved matrices for [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) (`gpt-6-luna`), [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) (`gpt-6-sol`) and [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview) (`claude-sonnet-5`). Luna and Sol used the OpenAI API; Sonnet used the Anthropic API.

Each has the same 60 case–schedule–repetition combinations under three architectures: **180 episodes per model, 540 in total**. This complete three-model subset was selected retrospectively from an original five-model lineup by coverage, not by correctness. Every terminal outcome is included.

A secondary comparison includes **Gemini 3.8 Flash** (`google/gemini-3.8-flash`) through Kaggle's hosted interface. Its 72 saved terminal episodes cover 24 combinations under all three architectures. The other models are compared on exactly those same combinations. The primary direct-provider runs are not Kaggle-hosted results.

The original lineup was recorded on September 25, 2026, with recent releases and sustainable recurring cost as the practical criteria. [Luna and Sol were released on September 22](https://developers.openai.com/api/docs/changelog). Sonnet 5, released June 30, was the explicitly chosen cheaper Anthropic tier, not the provider's latest overall release. These are dated selection decisions, not a claim about the current model catalog.

Inputs, prompts and profiles were frozen. Luna and Sol used medium reasoning effort; Sonnet used adaptive reasoning with high effort. These labels do not establish equal compute. Models ran at different times, and the Kaggle route has its own recorded settings. Each model's smoke test preceded its own pilot, but two smoke cases recur in the pilot, so they are not held-out confirmation.

The primary score requires an episode to finish under the declared interface and produce an exact final chart. Format failures remain unsuccessful outcomes. The direct-provider arms requested JSON through the prompt, without provider-enforced structured output. This matters for interpreting Sonnet's results; it is separate from the question of whether a completed record preserved the evidence. Saved, unmodified responses and first terminal outcomes are evaluated by the frozen rules, with no judge LLM.

## Findings

### Losing one assertion hid a conflict

In the reconciliation case, the first source reports **138**. A second source reports **145** for the same patient, event, concept and event time. Neither supersedes the other. At that point, the correct record contains both assertions, marked disputed.

A third source explicitly corrects both to **140**. Only then does the contract accept 140 and retain the two earlier assertions as superseded history. These numbers use synthetic units; the example concerns document relationships, not interpretation of a clinical measurement.

In both chronological repetitions, Luna's extractor returned no assertion for the first source. When the second source arrived, the ledger contained only 145, marked accepted. The software had no extracted counterpart with which to identify the conflict.

![A three-step saved synthetic trace. After 138 is omitted, the later conflicting value 145 is marked accepted instead of disputed. A correction to 140 yields the expected accepted value, but the history of 138 remains missing.](https://sergei-parfenov.com/assets/chartreplay-hidden-conflict.png)

*Observed Luna plus ledger trace, chronological delivery. “Accepted,” “disputed” and “superseded” are benchmark states, not judgments of medical truth. The figure shows the first three uploads of the six-document case.* [Open the trace at full size](https://sergei-parfenov.com/assets/chartreplay-hidden-conflict.png).

The first assertion is `CR-02-0000-D34123:1`; the conflicting source is `CR-02-0000-D12503`; the explicit correction is `CR-02-0000-D31621`. Those identities make the error traceable to particular documents rather than a vague claim that the model “forgot something.”

The correction to 140 was later applied correctly, but 138 remained absent through all six checkpoints. In the first repetition, **21 of 22 final queries still returned the expected answer**. The failed query asked for the measurement history. A consumer inspecting only the accepted value would miss the loss.

Full rebuild and rolling rewrite preserved the complete record in these chronological repetitions. The difference matters: repeated reconstruction gave those arms an opportunity that the one-pass extraction policy did not provide.

This is also why storing the original file and retaining its assertions in the usable record are separate requirements. The original document remained in the source archive. It was the derived record that lost its contribution, and with it the visible disagreement.

### Completeness matters even when retained facts are correct

The primary results use the same 60 combinations in every cell. “Exact” requires the complete final record, including history and relationships, and successful completion of the strict interface contract.

| Model | Full rebuild | Rolling rewrite | Extract plus ledger | Format failures across 180 episodes |
|---|---:|---:|---:|---:|
| GPT-6 Luna | 59/60 | 59/60 | 54/60 | 0 |
| GPT-6 Sol | 60/60 | 60/60 | 49/60 | 0 |
| Claude Sonnet 5 | 0/60 | 7/60 | 0/60 | 170 |

All six Luna ledger failures and all eleven Sol ledger failures involved missing assertions. In one chronological Sol episode, a source explicitly documented an allergy to `drug:beta`; its extraction was empty and the final record omitted the allergy.

Across Sol's 590 ledger checkpoints, all 3,961 predicted assertion occurrences matched the contract, against 4,094 expected occurrences: **100% precision and 96.75% recall**, yet only **49/60 exact final records**. These are repeated occurrences across checkpoints and schedules, not thousands of independent patients. Checking whether retained facts are supported would not, by itself, find every missing fact.

The experiment also contains successful handling of disagreement. In the dedicated unresolved-conflict case, Luna and Sol produced exact final records in all six schedule–repetition combinations under each architecture. The system could preserve a known conflict. The reconciliation failure shows what happens when extraction prevents one side from reaching that system.

A second case checks what the assertion actually means. Under duplicate replays, with eight unique documents delivered twelve times, all three Luna architectures preserved statements about the patient's mother and father separately from a suspected condition in the patient. They also kept an allergy marked unknown and a symptom explicitly denied, without creating duplicate assertions. Preserving a supported statement can mean preserving uncertainty, rather than confirming a diagnosis.

Exact scoring also catches literal-contract errors. Luna's single rebuild failure shortened the source identifier `procedure:alpha` to `alpha`; the assertion was present. That is a different defect from losing an allergy or hiding disagreement, even though each prevents an exact-record result.

### A correct final record is not enough during an ongoing history

Records may be used between uploads. Luna produced **1,713/1,770 exact checkpoints**, and Sol **1,656/1,770**. A final correction does not undo the period during which the record was incomplete.

We also required the three delivery schedules to produce the same correct final record for each case–repetition group. The ledger passed **14/20 groups for Luna** and **11/20 for Sol**; full rebuild passed **19/20 and 20/20**. An invariant but incomplete record would fail this requirement.

The experiment does not isolate a causal effect of upload order. For ledger, repeated identical schedules disagreed in 4/30 pairs for Luna and 10/30 for Sol; different schedules within a repetition disagreed in 12/60 and 19/60 pairs. These correlated comparisons show that ordinary model variability also matters. The strongest observation is the actual lost evidence and its consequences, not a claim that reordering alone caused every difference.

### Gemini adds evidence on the same available conditions

Gemini's 24 available combinations let us make a smaller matched comparison across four models and all three architectures. Selection uses availability only and includes every format failure.

| Model | Full rebuild | Rolling rewrite | Extract plus ledger | Format failures across 72 episodes |
|---|---:|---:|---:|---:|
| GPT-6 Luna | 24/24 | 24/24 | 22/24 | 0 |
| GPT-6 Sol | 24/24 | 24/24 | 19/24 | 0 |
| Claude Sonnet 5 | 0/24 | 5/24 | 0/24 | 65 |
| Gemini 3.8 Flash, via Kaggle | 23/24 | 20/24 | 17/24 | 11 |

These 288 outcomes comprise 72 Gemini outcomes and 216 reused from the primary comparison. All ten families appear, but unevenly; only one case–repetition group has all three delivery schedules. This is not a complete four-model test of order invariance.

Gemini's one completed but inexact episode was a shuffled medication history in the ledger arm. A newly delivered source described a separate 5 mg medication order. The extractor omitted it, leaving seven of eight required assertions in the final chart. It is another example of source information failing to enter the derived record.

The sample also contains counterevidence to a blanket preference for reconstruction. In the chronological 24-document history, Gemini's ledger passed all 24 checkpoints, while rebuild and rewrite stopped on format violations at steps 24 and 8. A stopped integration and an incomplete completed record are different outcomes.

A necessary interpretation note: all 170 Sonnet format failures and all eleven Gemini format failures involved Markdown-wrapped JSON. Offline removal of one outer wrapper made those responses pass the schema; the accumulated record at the rejected step was exact in 121/170 and 10/11 cases, respectively. These diagnostics do not repair primary scores or invent the later responses of episodes stopped early. The low Sonnet totals cannot be read as a general inability to understand the sources. The missing-fact examples above come from responses the original interface accepted.

### Lower expense does not price the missing verification step

At the September 25 tariffs and observed cache usage, the selected 60-episode rebuild and ledger arms cost an estimated **$0.31 and $0.11 for Luna**, and **$5.68 and $2.06 for Sol**. These are model-token estimates for selected calls, not provider invoices or production bills; interrupted attempts and unknown costs remain separate.

Those cheaper ledger results include the consequences of the one-pass policy. A completeness check, targeted re-extraction or periodic reconciliation would add work that was not measured. We have not established the cheapest design that meets an acceptable quality target for Symptomato.

## My Benchmark

ChartReplay separates source inputs from evaluator-only expected records. It retains original source text, assertion identities, correction links, delivery schedules and saved response traces, so an error can be inspected at the update where it appeared. The ledger's disposition rules are explicit; a claim is not considered supported merely because it cites some document.

The evaluator needed its own checks. An initial audit corrected timestamp comparison, categorical normalization and validation inconsistencies. Calibration then ran 9,240 deterministic episodes across 120 fixtures, seven schedules and eleven systems. Two positive controls each passed 840/840 final episodes and 5,988/5,988 checkpoints; all nine deliberately injected fault types were detected in at least one applicable case. These results check the declared contract, not clinical understanding.

A separate controlled demonstration removed every superseded assertion from 24 parameterized histories. Eight existing questions still passed on all 24; full-record evaluation passed on none. Adding a history question exposed every failure. Question answering can test the same contract if its coverage is exhaustive, but a handful of correct answers is not evidence that the whole record survived.

Streaming evaluation of medical memory is established prior work. [MedMemoryBench](https://arxiv.org/abs/2605.11814) evaluates memory as it is constructed; [ClinTraceBench](https://arxiv.org/abs/2609.01111) studies longitudinal clinical tasks with source-verifiable evidence. ChartReplay's narrower contribution is an explicit record-construction contract and traces showing how an update can lose evidence or change its disposition.

### What this changes for the system we are building

For Symptomato, I would treat preservation of the original upload, faithful extraction and justified reconciliation as separate checks. The record should make it possible to inspect the source behind an assertion and to see why an earlier assertion was corrected or remains disputed. A summary can be a view of that history; it should not become the only surviving representation of it.

The next intervention to test is a check before committing an update: did every assertion required by the record contract reach the record from each new source, and are its corrections or conflicts still represented? A failure should lead to review or targeted re-extraction while preserving the original evidence. That intervention has not been evaluated here; the existing results locate the failure boundary, not the performance of a proposed fix.

A further evaluation needs independently annotated, naturally written document sets with ambiguous references, dates and source quality. OCR would need its own paired tests against the corresponding text. The present experiment does not assess document authenticity, rank competing sources by authority, verify real-world medical facts or establish clinical safety. A prepared controlled-prose layer has not been run through models and would not, by itself, establish those capabilities.

OpenAI Codex assisted implementation, offline analysis and drafting. The cover was generated with AI; the trace figure comes from saved experimental states. No model was used to judge the reported record scores.

A record we can inspect must keep disagreement visible until there is evidence to resolve it. In the observed failure, the system made that disagreement disappear before the correction arrived. Preserving the accepted answer at the end was not enough to preserve the patient's documented history.
