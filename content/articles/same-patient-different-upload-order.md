---
title: "Same Patient, Different Upload Order: Does AI Build the Same Medical Record?"
slug: "same-patient-different-upload-order"
description: "A 540-episode experiment for Symptomato tests three ways to maintain a medical record. A cheaper ledger kept the omissions its extractor introduced."
published: true
date: "2026-09-30T09:09:19Z"
updated: "2026-09-30T09:09:19Z"
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

A patient uploads a laboratory report. Later, they upload a correction. A week after that, they accidentally upload the original report again.

The corrected result should remain the accepted statement. The original should remain available as corrected history. Re-uploading it should not create another measurement or make the correction disappear.

Now deliver those documents in a different order. After the system has received the same evidence, should the medical record be different?

I'm a technical consultant at [Symptomato](https://symptomato.com), where AI gathers context before a human health specialist joins the conversation. For Symptomato, we are building a way to turn incoming documents into a longitudinal record without losing the statements and corrections they contain. **ChartReplay** is the experiment I built to test that construction process.

The main comparison covers three models and 540 episodes on the same controlled synthetic cases. Its most useful failure was simple: a model returned an empty extraction for a document containing an explicit fact. The deterministic ledger then preserved an incomplete history through every remaining update.

### The record must preserve the relationship between facts

Consider a deliberately simplified example. A report gives a measurement as 8.1. A correction changes it to 5.2. A second correction changes it to 5.4. A later, independent measurement is 6.3.

Those are four source assertions, but only two measured events. A correct record preserves the earlier values as correction history and keeps the later measurement separate. It must also preserve the subject, event date, source and relationship between assertions. A family member's condition must not become the patient's condition; uncertainty must not become confirmation; missing information must not become an explicit negative.

This is an information-integrity task. A medication order, for example, does not establish that someone took the medication. An absent allergy entry does not establish that the patient denied having allergies. The distinction follows the source semantics described by [FHIR MedicationRequest](https://hl7.org/fhir/R4/medicationrequest.html) and [AllergyIntolerance](https://hl7.org/fhir/R4/allergyintolerance.html), rather than a diagnostic judgment.

ChartReplay scores the constructed record, including superseded assertions and unresolved conflicts. A citation must support the particular assertion. Repeated predictions are not silently deduplicated by the evaluator.

### The same evidence arrives three ways

The model pilot uses chronological delivery, a seeded shuffle and duplicate replays. Document identifiers, event dates, source timestamps and correction references remain unchanged. Every schedule eventually delivers the same unique source set.

Intermediate states necessarily differ: a system that has not received a correction should not be scored as though it had. At each checkpoint, the evaluator reconstructs the expected record from the source documents available so far. Final equivalence is tested only after equivalent evidence has arrived.

Order invariance by itself is insufficient. An empty record is invariant. So is a system that ignores every correction. The benchmark therefore requires correctness and invariance together.

### Three architectures, one source contract

**Full rebuild** generates a complete chart from all currently available originals. It is a baseline, not an oracle: having all the documents does not guarantee a correct output.

**Rolling rewrite** receives the previous chart, newly delivered documents and the complete available archive. It rewrites the chart without an imposed compression budget.

**Extract plus ledger** asks the model to extract new assertions. A deterministic event ledger then applies the declared rules for corrections, conflicts and historical preservation.

The third architecture delegates some work to software. Its results belong to that combined system, rather than to the model alone. All three architectures have access to the same available sources, but their prompts, outputs and computation differ. Each call starts a fresh conversation so unrelated cases cannot leak into one another.

There is no artificial chart-size budget. Source assertions and correction history may all be retained. Provider context and output limits still apply, and complete-chart generation uses one response; multi-part generation for arbitrarily large records is not implemented. Those limits must remain visible rather than producing hidden truncation.

### Controlled grammar gives an exact answer key

The dataset contains 120 self-authored synthetic cases across ten logical families: 1,020 source documents and 1,092 assertions. The families cover correction chains, unresolved conflicts, explicit reconciliation, family attribution, uncertainty, medication orders, repeated versus independent measurements, time offsets, similar-looking sources, multi-assertion notes and long sequences of similar observations.

The pilot uses one variant from each family: ten cases, with three delivery schedules and two repetitions. Source codes and event identifiers are explicit. Only one family places several assertions in a document. These are neither real patient records nor Synthea exports, and they do not represent unrestricted clinical prose.

The controlled grammar lets us check every expected assertion. It also limits the conclusion: success here establishes compliance with this contract, not clinical competence. A separate prose layer has been prepared but has not been evaluated with models.

## Models Tested

The main analysis uses complete saved pilot matrices for [**GPT-6 Luna**](https://developers.openai.com/api/docs/models/gpt-6-luna) (`gpt-6-luna`), [**GPT-6 Sol**](https://developers.openai.com/api/docs/models/gpt-6-sol) (`gpt-6-sol`) and [**Claude Sonnet 5**](https://platform.claude.com/docs/en/models/sonnet-5/overview) (`claude-sonnet-5`). Luna and Sol ran through the OpenAI API; Sonnet ran through the Anthropic API. These are direct-provider results, not Kaggle-hosted runs.

Each model has the same 60 case–schedule–repetition keys, evaluated under all three architectures: **180 episodes per model, 540 in total**. The analysis includes every terminal outcome in these complete matrices. Inclusion depends on matrix coverage, not on response validity or chart correctness. The underlying study retains the full planned inventory and additional model results separately.

The model lineup was recorded on September 25, 2026, before pilot results. The practical criteria were recent releases and sustainable recurring cost. [Luna and Sol were released on September 22](https://developers.openai.com/api/docs/changelog). Luna was the low-cost candidate; Sol tested whether additional expense bought better preservation. Sonnet 5, released June 30, was an explicitly selected cheaper Anthropic tier, rather than the provider's latest overall release. These are dated selection decisions, not claims about the current catalog. A larger research budget does not make an expensive model an affordable production choice.

All runs used frozen inputs, prompts, profiles and a strict JSON contract. Luna and Sol used medium reasoning effort; Sonnet used adaptive reasoning with high effort. Those labels do not establish equal reasoning compute. Each model's smoke test preceded its pilot, but two smoke cases recur in the pilot, so they are not held-out confirmation.

Architecture arms ran in blocks, with up to four independent episodes in parallel. Models ran at different times. Repeated inputs could use provider prompt caches; completed responses were not reused between episodes. These conditions matter when interpreting cost and latency. Model identifiers and code hashes establish which requests we made, not unchanged hidden weights or service defaults.

Primary scoring uses unmodified responses and the first saved terminal outcome. Invalid output is an unsuccessful episode. Removing a Markdown fence is diagnostic only; it does not repair the primary result. Interrupted attempts remain in the execution history and are not spliced into selected episodes. Saved responses are replayed against the frozen evaluator, with no judge LLM.

## Findings

### A ledger cannot retain a fact the extractor never supplies

Each cell below contains the same 60 episode keys. All 170 Sonnet format failures remain in the denominator.

| Model | Full rebuild: exact final charts | Rolling rewrite: exact final charts | Extract plus ledger: exact final charts | Strict-format failures |
|---|---:|---:|---:|---:|
| GPT-6 Luna | 59/60 | 59/60 | 54/60 | 0/180 |
| GPT-6 Sol | 60/60 | 60/60 | 49/60 | 0/180 |
| Claude Sonnet 5 | 0/60 | 7/60 | 0/60 | 170/180 |

Luna produced **172/180 exact final charts**. All six ledger failures involved missing assertions. In both chronological repetitions of the reconciliation case, the first source explicitly recorded a measurement of 138. The model returned:

```json
{"claims": []}
```

That assertion remained missing through all six checkpoints, including the corrected history at the end. The ledger had no extracted assertion to reconcile.

Luna's other failures had different mechanisms. Full rebuild retained a procedure assertion but shortened its concept identifier from `procedure:alpha` to `alpha`, violating the literal-code contract. Rolling rewrite omitted a measurement of 4.8 from the long-history case. Exact-record scoring detects both, but they are different engineering problems.

Sol produced **169/180 exact final charts**. Full rebuild and rolling rewrite were exact in every final episode; all eleven ledger failures involved missing claims. In the first chronological medication episode, the eighth source explicitly documented an allergy to `drug:beta`. Sol returned the same empty extraction. The allergy was missing from the final chart.

Across Sol's 590 ledger checkpoints, all 3,961 predicted assertion occurrences matched the source contract, against 4,094 expected occurrences. Pooled claim precision was **100%** and recall **96.75%**, while only **49/60 final charts** were exact. These occurrences repeat across checkpoints and schedules; they are not thousands of independent facts or patients. High precision can coexist with an incomplete record.

For Luna, ledger final success was 8.33 percentage points below full rebuild. Resampling the ten synthetic families gave an exploratory 95% percentile interval of **−18.33 to 0 percentage points**. For Sol, the difference was −18.33 points, with an interval of **−33.33 to −6.67**. These intervals describe sensitivity to this family mix, not uncertainty in a clinical population. Luna's interval includes zero.

### Correct final charts can hide incorrect intermediate records

Luna had **1,713/1,770 exact checkpoints**; Sol had **1,656/1,770**. Their responses were schema-valid throughout the selected episodes.

We also tested correctness and invariance together. Each case–repetition group contains all three schedules; it passes only if all three produce the same correct final chart. There are 20 such groups per architecture.

| Model and architecture | Exact checkpoints | Correct and invariant groups |
|---|---:|---:|
| Luna — full rebuild | 584/590 | 19/20 |
| Luna — rolling rewrite | 578/590 | 19/20 |
| Luna — extract plus ledger | 551/590 | 14/20 |
| Sol — full rebuild | 590/590 | 20/20 |
| Sol — rolling rewrite | 590/590 | 20/20 |
| Sol — extract plus ledger | 476/590 | 11/20 |

The long-history case contains 24 distinct source documents. Sol's ledger charts were exact at 4/6 checkpoints with four sources visible and 2/6 with thirteen visible. Full rebuild and rolling rewrite were exact at every checkpoint in that case. Luna's ledger remained exact at all six checkpoints through thirteen visible sources, then at five of six for each length from fourteen through twenty-three.

This describes where omissions appeared and persisted. It does not isolate a causal effect of record length or establish a safe history-size threshold.

### Different upload orders are not the only source of disagreement

Luna's ledger final charts disagreed in **4/30 pairs repeating an identical schedule**, compared with **12/60 pairs using different schedules within a repetition**. Sol's corresponding counts were **10/30 and 19/60**.

These pairs share cases and outputs. They are correlated observations, and their difference cannot simply be attributed to upload order. Repeating the same schedule provides a necessary baseline for ordinary model variability.

The experiment contains ten controlled histories reused across models, schedules and repetitions. It measures 540 system outcomes, not 540 independent patients.

### Sonnet measured a different failure boundary

Sonnet's primary result was **7/180 exact final charts (3.89%)**. In 170 episodes, a response wrapped JSON in a Markdown fence and violated the frozen interface contract.

All 60 full-rebuild episodes failed that contract. Rolling rewrite had seven exact completed episodes and 53 format failures. Extract plus ledger had three schema-valid completed episodes with inexact final charts and 57 format failures.

Among the ten schema-valid completed episodes, 7/10 final charts and 61/86 checkpoints were exact. These conditional figures exclude valid prefixes of episodes that later failed the format contract. They do not replace the 180-episode primary result or describe a complete 1,770-checkpoint workload. None of Sonnet's case–repetition groups passed the requirement for correct final charts under all three schedules.

This result measures compliance with the specified interface. It does not establish a general inability to understand medical information. Removing fences cannot tell us what the unexecuted later updates would have produced. A more permissive parser or different prompt would require a separate experiment.

### Lower token expense came with a less complete record

The cost question for Symptomato is recurring work: ingest an existing history, then update it as new documents arrive. To make that concrete, I used an illustrative month with **1,000 initial histories and 10,000 subsequent uploads** matching the short synthetic cases.

Initial ingestion means processing the whole history sequentially, one document per call. An upload uses the last measured call of a chronological episode as its proxy. Each architecture contributes ten cases and two repetitions: twenty histories containing 3–24 sources, with a mean of 8.5. Bulk ingestion in one call and larger future histories were not measured.

Using the [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) and [Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) tariffs recorded on September 25 and the observed cache usage:

| Model and architecture | Illustrative monthly model-token expense | Exact final charts in the chronological subset |
|---|---:|---:|
| Luna — full rebuild | $10.99 | 20/20 |
| Luna — extract plus ledger | $3.79 | 16/20 |
| Sol — full rebuild | $204.60 | 20/20 |
| Sol — extract plus ledger | $70.58 | 14/20 |

Repricing the full-rebuild tokens without cache gives $12.75 for Luna and $234.04 for Sol. Repeated benchmark inputs may produce cache reuse a product will not reproduce.

These are scenario calculations, not production bills. They hold document mix, token counts and update sizes fixed, assume no additional history or upload retries, and exclude OCR, hosting, storage and human review. Unknown costs from other attempts remain separate. Sonnet's early format failures reduce the work performed, so its recorded total cannot price a completed equivalent workload.

The lower ledger estimates are useful, but selecting on expense alone would select a less complete system in this sample. The price–quality tradeoff belongs to each model–architecture pair; this experiment does not select a production winner.

### The evaluator also needed testing

The software audit found errors before the main model comparison. Timestamps were initially compared as strings: `10:00+02:00` could be treated as later than `09:30Z`, despite representing an earlier instant. Numeric normalization was also too broad, allowing the categorical string `00123` to match `123`. Both contracts were corrected, along with inconsistencies in query validation and ledger canonicalization.

Local calibration then executed **9,240 episodes**: 120 cases, seven schedules and eleven deterministic systems. Two positive controls each passed all 840 final episodes and all 5,988 checkpoints. One receives correct structured assertions; the other parses the known source grammar before updating the ledger. All nine deliberately injected fault types were detected in at least one applicable case.

Those results test the fixtures, rules and evaluator together. They are not additional model results or evidence that an LLM can read arbitrary clinical documents.

A separate controlled demonstration shows why checking the record matters. On 24 parameterized histories, a faulty implementation removed every superseded assertion. Eight existing questions still passed on all 24 histories; full-record evaluation passed on none. Adding a question about corrected-value history exposed the fault in every history.

An exhaustive question suite can cover the same contract. Record-level evaluation makes that required coverage explicit instead of depending on which downstream questions happened to be chosen. The query layer here is ordinary Python, not another answering model.

## My Benchmark

ChartReplay is a local implementation of a record-construction benchmark. It separates source inputs from evaluator-only truth and includes delivery schedules, field-level scoring, three update architectures, deterministic controls and source-linked traces. The experiment retains raw prompts and responses, settings, model identifiers, attempt ownership and source hashes. Primary scoring can be reproduced from saved responses without calling a model.

The failure explorer makes the relevant transition inspectable: which document arrived, what the model extracted, and which assertion the resulting record omitted or changed. That is the useful unit of debugging. “The model made a mistake somewhere in the history” is too broad to guide a repair.

Streaming evaluation of medical memory is established prior work. [MedMemoryBench](https://arxiv.org/abs/2605.11814) evaluates memory as it is constructed; [ClinTraceBench](https://arxiv.org/abs/2609.01111) compares history representations through source-verifiable longitudinal clinical tasks. ChartReplay focuses on an explicit record-construction contract: delivery transformations, whole-record checking and preserved correction history.

The current correction contract covers the same subject and documented event. Corrections that change identity or event date need additional rules. Fuzzy duplicate detection, OCR, unrestricted clinical prose and medication-adherence inference are outside this implementation. The experiment establishes neither clinical safety nor the absence of all possible unsupported claims.

OpenAI Codex assisted implementation, offline analysis and drafting. The reported results come from saved model responses evaluated against the frozen source contract. Cover illustration generated with AI.

For the system we are building, the next engineering question is whether an update process can detect an omitted source assertion before committing the record. That intervention has not been tested here. What this experiment does show is where the check belongs: the ledger preserved what it received; the fact had already been lost at extraction.
