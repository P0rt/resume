---
title: My Strawman Baseline Beat My Own Scheme on Half the Gate Classes
slug: my-strawman-baseline-beat-my-own-scheme-on-half-the-gate-classes-177h
description: >-
  Four provenance-tracking arms, identical gates, one uncompacted oracle:
  measuring exactly what memory compaction does to agent gate decisions -
  including the preregistered hypothesis that failed.
published: true
date: '2026-07-06T11:48:40Z'
updated: '2026-07-06T11:48:40Z'
readingTime: 12
tags:
  - ai
  - llm
  - architecture
  - agents
language: en
coverImage: ''
source: dev
sourceUrl: >-
  https://dev.to/p0rt/my-strawman-baseline-beat-my-own-scheme-on-half-the-gate-classes-177h
devId: 4060532
canonicalUrl: >-
  https://sergei-parfenov.com/blog/my-strawman-baseline-beat-my-own-scheme-on-half-the-gate-classes-177h/
---

[Part 4](https://dev.to/p0rt/your-provenance-vector-dies-at-the-storage-boundary-4cc) ended with a question I couldn't answer: has anyone actually measured what gate decisions do on the reconstructed provenance vector versus the original? Not argued from first principles. Measured.

Nobody in the comments had data. Neither did I. So I built the harness: [provenance-compaction-lab](https://github.com/P0rt/provenance-compaction-lab).

## Four arms, one oracle

Four provenance-tracking arms observe the *same* synthetic trajectory - same seed, same degradation events, same merges. They differ only in what happens to provenance between decisions:

- **ground_truth** - full vector, full lineage, never compacted. The oracle everything else is judged against.
- **structural_min** - the Part 4 scheme. Axis scores keep their running min. Every C steps, lineage truncates to the last K hops; taint ids attached in the folded prefix are dropped, only a count survives. The compression penalty multiplies into `reconstruction`, which is folded into the min like any other axis.
- **structural_perhop** - identical, except `reconstruction` is never min-folded. It's carried structurally as `(n_compactions, worst_penalty)` and handed to gates as data.
- **prose** - the honest-but-naive baseline, not a proposal. Every C steps an LLM summarizes the working state, provenance included, into ≤150 words; a second call extracts scores and taints back out. Whatever survives the round trip is all this arm knows.

Merge is unchanged since [Part 3](https://dev.to/p0rt/trust-isnt-a-scalar-typed-provenance-for-agent-chains-229p) - element-wise min:

```python
def merge(vectors: Iterable[ProvenanceVector]) -> ProvenanceVector:
    """Merge = element-wise min across inputs (Part 3)."""
    vs = list(vectors)
    if not vs:
        raise ValueError("merge() needs at least one input vector")
    return ProvenanceVector(
        scores={axis: min(v.scores[axis] for v in vs) for axis in AXES}
    )
```

Every 5 steps, nine gate policies - score thresholds, reconstruction-coupled, lineage blocklist, lineage allowlist, several flagged irreversible - fire against all four arms, and every disagreement with the oracle is logged. The matrix: 500-step horizons, cadences C ∈ {10, 25, 50}, K=5, allowlist window W=8 (> K deliberately, so the starvation shows), reconstruction penalty 0.02 per compaction, three degradation profiles, 20 seeds per cell. All four hypotheses were written into the spec before the first line of code. The whole mock matrix reruns in seconds, deterministic per seed.

One limitation up front: the trajectories are synthetic. The generator is the component you're meant to swap for your own traces - more on that at the end.

## Anatomy of one false-proceed

Before any aggregate number, here is one decision going wrong, hop by hop.

Seed 0, C=25, med profile. Decision at step 25, gate `payment_no_untrusted_taint` - irreversible, blocks on `unverified_web` and `tool_flaky` taints. The working value's full taint history at step 25, which is what the oracle sees:

```plaintext
taint:unverified_web:2      ← unverified web fetch, step 2
taint:tool_flaky:6          ← flaky tool call, step 6
taint:tool_flaky:7          ← flaky tool call, step 7
taint:unverified_web:11     ← unverified web fetch, step 11
taint:stale_cache:16        ← stale cache read, step 16
taint:fallback_model:24     ← fallback model, step 24
```

At step 25 the first compaction fires. This is the deliberate lossy step, verbatim from the repo:

```python
def truncate_lineage(state: ValueState, keep_hops: int) -> None:
    """Truncate to the last K hops; fold the prefix into aggregate counts and
    drop the folded taint ids from ``tainted_by`` (only the count survives)."""
    hops = state.lineage.hops
    if len(hops) <= keep_hops:
        return
    folded_now = hops[: len(hops) - keep_hops]
    kept = hops[len(hops) - keep_hops :]
    prefix = state.lineage.folded or FoldedPrefix()
    for hop in folded_now:
        prefix.absorb(hop)
    state.lineage.hops = list(kept)
    state.lineage.folded = prefix
    # invariant for structural arms: tainted_by == union of taints_added over
    # the surviving (visible) hops - folded taint ids are gone.
    state.tainted_by = set().union(*(set(h.taints_added) for h in kept)) if kept else set()
```

Lineage truncates to the last K=5 hops. Every taint attached in the folded prefix is gone. What structural_min still sees:

```plaintext
taint:fallback_model:24
```

The oracle blocks the payment - four gate-relevant taints. structural_min sees zero gate-relevant taints and proceeds. Nothing in the surviving state even hints that a check was skipped: the fold counter (`n_taints_folded`) is the only trace, and a default-allow gate has no reason to look at it.

Same state under the other two lineage strategies - measured, not hypothetical. **Degrade-to-untrusted** sees `n_taints_folded > 0` and refuses to act; here it happens to be right, but had the folded taints been benign, the same refusal would have been a false-stop. **Rehydrate** fetches the 21 folded hops of the value's merged ancestry from the append-only log - 2.6 KB read - and recovers the oracle's block exactly.

That single mechanism, repeated across the matrix, produces the first headline number.

## The headline numbers

1. **3.47%** of irreversible-action decisions (payment, send) proceeded when the uncompacted oracle said block - structural_min, C=25, med profile.
2. structural_min memory **dies at compaction cycle ≈ 35**: from that cycle on, every reconstruction-coupled gate blocks permanently (0.98³⁵ ≈ 0.493 < 0.5). structural_perhop never dies.
3. Prose-vs-structural flip ratio: **1.39×** - prose disagrees with the oracle on 9.97% of decisions, structural_min on 7.16%, all gates pooled.
4. Rehydration: **459 cold-storage lookups per 100 lineage-gate decisions** buy the flip rate down from 8.01% to 0.00%.

One sort before the details, because that list mixes two kinds of number. The death cycle is arithmetic in a lab coat - 0.98³⁵ < 0.5 needs a calculator, not a harness - and the error polarity two sections down follows from the gate definitions once you state them. For those, the harness contributes the price tag, not the fact. Numbers 1, 3 and 4 are measurements: nothing in the setup forces 3.47% rather than 12%, prose losing overall while winning two gate classes, or rehydration costing 4.6 lookups instead of 40.

![False-proceed rate on irreversible gates versus compaction cadence, one line per degradation profile: the more often memory compacts, the more often irreversible actions fire against the oracle's block](https://raw.githubusercontent.com/P0rt/provenance-compaction-lab/main/docs/figures/fig_false_proceed_vs_cadence.png)

## Boyko was right twice

On Part 4, Nazar Boyko made two claims sharp enough to preregister as hypotheses.

**Claim one:** axis scores would track closely between arms; the gates that inspect *lineage* are where decisions split. Confirmed - with a disclosure. Score-gate flip rate for both structural arms is 0.00%, and that number is **by construction, not a discovery**: compaction never touches the running min of the base axes, and the harness property-tests exactly that invariant (base-axis drift against the oracle: 0.0000, at every decision point, every config). What the measurement adds is where divergence concentrates once scores are ruled out: lineage gates flip 8.01% of decisions blind, and reconstruction-coupled gates do worse than that.

**Claim two:** the recursion. If the compression penalty is folded into a running min, `reconstruction` decays monotonically toward zero regardless of how clean each individual hop is. The death-spiral run - 5,000 steps, C=25, 200 compactions - confirms it: monotone the whole way down, crossing the 0.5 gate threshold at cycle 35. From that point every reconstruction-coupled gate blocks permanently. The scores are pristine, the memory is technically alive, and nothing is allowed to act on it.

structural_perhop, which carries `(n_compactions, worst_penalty)` instead of folding, posts **0.00%** flips on the same gates and never dies. Drift says the same thing from another angle: structural_min's only drifting axis is `reconstruction`, at 0.2100 MAE against the oracle; perhop holds it to 0.0191.

![Reconstruction axis over compaction cycles: the min-folded variant decays monotonically and crosses the 0.5 gate threshold at cycle 35, while the per-hop variant stays flat indefinitely](https://raw.githubusercontent.com/P0rt/provenance-compaction-lab/main/docs/figures/fig_reconstruction_decay.png)

## The error direction is a design choice

Both lineage gate styles were in the harness on purpose, and W > K was chosen deliberately so the starvation would show.

**Blocklist gates** - default-allow: "block if any `taint:unverified_web:*` appears in `tainted_by`." They fail dangerous: **8.50% false-proceeds, 0.00% false-stops**. The fold forgets taints; the gate finds nothing to object to.

**Allowlist gates** - default-deny: "proceed only if lineage proves no fallback hop within the last 8 hops." They fail expensive: **7.53% false-stops, 0.00% false-proceeds**. The proof gets folded away; the gate refuses.

Perfect polarization, and it's the same compaction both times. Compaction decides *that* you lose information; the gate's default under missing information decides *which way* you fail. So pick the polarity per action class: default-deny anything irreversible. You pay in over-blocking. The alternative pays in wired money.

The direction of this result was predictable from the definitions - that's exactly why it preregistered cleanly. The magnitudes at these degradation rates were not.

![Gate agreement with the oracle by gate class and arm: structural arms hold 100 percent on score gates, and the divergence concentrates in reconstruction-coupled and lineage gate classes](https://raw.githubusercontent.com/P0rt/provenance-compaction-lab/main/docs/figures/fig_gate_agreement_by_class.png)

## The strawman refuses to die

H4, as preregistered: *prose flip rates dominate the structural arms on every gate class.* Verdict: **FAIL.** Per gate class, mock channel, blind mode:

| gate class | prose | structural_min | structural_perhop |
|---|---:|---:|---:|
| score | 2.44% | 0.00% | 0.00% |
| reconstruction | 4.97% | **16.17%** | 0.00% |
| lineage_blocklist | 6.82% | **8.50%** | 8.50% |
| lineage_allowlist | **29.41%** | 7.53% | 7.53% |

The strawman beats the Part 4 scheme on two of four classes. On reconstruction-coupled gates, the min-folded penalty is a bigger source of corruption than the noisy channel - the death spiral punishes structural_min before prose noise catches up. On blocklist gates, deterministic truncation forgets taints at roughly the rate a lossy extractor does.

My first instinct was that the mock channel was rigged against prose - taint recall was *assumed* at 0.6. So I ran the real one: gpt-5-mini, the actual summarize→extract round trip. Here is the blob it produced for the exact six-taint state from the worked example above:

> Working memory state: freshness 0.700, capability 0.650, tool_integrity 0.650, verification 0.450, reconstruction 1.000. Attached taints: taint:fallback_model:24, taint:stale_cache:16, taint:tool_flaky:6, taint:tool_flaky:7, taint:unverified_web:11, taint:unverified_web:2. Overall, the memory is moderately fresh and moderately capable with intact reconstruction, but tool integrity is degraded and verification is low, indicating reduced trust in outputs that relied on tools or external content. Multiple taints note use of a fallback model, stale cache data, two instances of flaky tools, and two unverified web sources; these should be considered when using or revalidating this state.

Extraction recovered all five scores exactly and all six taint ids. Across 993 extractions: 0 parse failures, taint recall 0.893, precision 0.904 (245 fabricated taints), score MAE ≈ 0.0001. A modern small model copies explicit values through prose nearly losslessly.

| parameter | mock (assumed) | gpt-5-mini (measured) |
|---|---|---|
| score noise | gaussian σ = 0.08 | ≈ 0.0001 MAE |
| taint recall | 0.60 | 0.893 |
| taint precision | 0.90 | 0.904 |
| flip rate, score gates | 2.4% | 0.08% |
| flip rate, reconstruction gates | 5.0% | 0.0% |
| flip rate, allowlist gates | 29.4% | **43.1%** |

Disclosure on this table before the punchline: the real column is a smaller slice - C ∈ {10, 25}, med profile only, 2 seeds, those 993 extractions - while the mock column is the full matrix. Read it as channel characterization, not a matched benchmark; the repo ships a matched-slice config if you want the strict twin. (The matched slice also doubles as a sanity check: the structural arms' columns come out identical between mock and real runs, because they never touch the channel - the only column that actually moves is prose.)

The last row is the point. The channel got nearly perfect, and allowlist flips got *worse*. A summary preserves values; it destroys structure. "No fallback hop within the last 8 hops" is a proof about an ordered window, and no amount of faithful prose reconstitutes the window. **The failure mode of prose isn't noise - it's the loss of provability.**

Caveat, because it matters: this measured the channel in a best case. The summarize prompt hands the model a clean structured list and asks it to carry the list across. Real agent memory interleaves provenance with content competing for the same 150 words. Treat the mock's 0.6 recall as the pessimistic bound and gpt-5-mini's 0.893 as the optimistic one - on structure-dependent gates, both bounds tell the same story.

## Where the crossover sits

"Prose sometimes beats structural_min" is a result. A design rule needs to know *when*. A finer cadence sweep, C from 5 to 100, med profile, 20 seeds per point, settles it.

On reconstruction-coupled gates, structural_min is worse than the prose strawman at every cadence up to C=50 - at C=10 that's 34.92% flips against prose's 6.85% - and only drops below prose between C=50 and C=75. The rule that falls out: **once memory sees more than ~7-10 compaction cycles inside a decision horizon, min-folded reconstruction - not summarization noise - is the dominant corruption source.** On blocklist gates the cross comes even earlier, around C=15. Pooled over all gate classes, prose stays behind at every cadence - allowlist starvation and score noise keep it there.

Before anyone quotes that bolded rule as a constant: it isn't one. The threshold is a function of two parameters I chose - the per-compaction penalty (0.02 here) and the noise of the channel it races. The death cycle is closed-form: memory dies at n = ln(θ) / ln(1 − p), which at θ = 0.5, p = 0.02 gives 34.3 - the first whole cycle below threshold is 35, matching the run. That part scales as 1/p: double the penalty, halve the death cycle. Arithmetic.

The crossover against prose does *not* scale as 1/p - and I know because I assumed it would and swept it: 14 cadences × 5 penalties × 20 seeds, 1,400 mock runs, under a minute. The fit says the crossover cycle count moves as ~p^−1.6, steeper than 1/p, because the baseline it races isn't flat: prose noise compounds with cycle count too, just slower, so as the penalty shrinks, the intersection runs away superlinearly. (Exponent fitted on the sweep grid, p from 0.005 to 0.1 - don't carry it far outside.) `prov-lab report` prints the analytic death cycle for whatever penalty you configure, and `prov-lab sweep` maps your crossover - so the rule you quote can be yours, not mine.

![Crossover cadence between structural_min and the prose channel as a function of the reconstruction penalty, log axes, with the fitted power law near p to the minus 1.6](https://raw.githubusercontent.com/P0rt/provenance-compaction-lab/main/docs/figures/fig_crossover_vs_penalty.png)

Which exposes what H4 got wrong at preregistration time: "structural vs prose" was never the axis. The axis is *which fields the compaction preserves, relative to which fields the gates read*. Every arm in this experiment failed exactly where it discards something some gate consumes.

## Quimby's question has a price tag

Max Quimby asked, on Part 4: when lineage has been compressed and a policy needs the detail - do you re-expand from somewhere, or does the policy degrade to treating the result as untrusted? Both answers are in the harness, with deciding blind as the control. The irreversible payment gate, three ways:

| mode | agreement | false-proceed | false-stop | lookups / 100 decisions |
|---|---:|---:|---:|---:|
| blind | 91.22% | 8.78% | 0.00% | 0 |
| degrade | 95.72% | 0.00% | 4.28% | 0 |
| rehydrate | 100.00% | 0.00% | 0.00% | 639.9 |

Aggregated across all lineage gates: 459 lookups per 100 decisions, tens of KB read, flip rate 8.01% → 0.00%. The gate with all three modes, verbatim:

```python
    def evaluate(
        self, view: GateView, mode: str = "blind", hop_log: HopLog | None = None
    ) -> GateDecision:
        taints = set(view.tainted_by)
        lookups = 0
        bytes_read = 0
        detail_missing = view.folded is not None and view.folded.n_taints_folded > 0
        if mode == "degrade" and detail_missing:
            # degrade-to-untrusted: taints were dropped, refuse to act
            return GateDecision(proceed=False)
        if mode == "rehydrate" and detail_missing and hop_log is not None:
            assert view.folded is not None
            hops, bytes_read = hop_log.fetch(view.folded.folded_hop_ids)
            lookups = len(view.folded.folded_hop_ids)
            for hop in hops:
                taints |= set(hop.taints_added)
        blocked = any(_matches(t, self.block_prefixes) for t in taints)
        return GateDecision(proceed=not blocked, lookups=lookups, bytes_read=bytes_read)
```

Degrade costs nothing and converts every dangerous error into an expensive one - a legitimate answer for reversible actions. Rehydration from an append-only hop log recovers the oracle *exactly*, at a price that turned out measurable and small: about 4.6 lookups per lineage-gate decision. For irreversible gates, that's the trade I'd take every time.

## What to actually build

- **Persist running-min axis scores.** Constant size, lossless by construction, drift 0.0000 at every decision point - property-tested. This half of Part 4 survives contact with measurement.
- **Never fold a compression penalty into a min.** Track `(n_compactions, worst_penalty)` structurally. perhop flips 0.00% of reconstruction-coupled decisions and never dies.
- **Pick gate polarity per action class.** Default-deny anything irreversible: fail expensive, not dangerous.
- **Append-only hop log plus rehydrate-on-demand** for irreversible gates; degrade-to-untrusted is fine for reversible ones. A reference implementation on stdlib sqlite3 ships in the repo as `provlab.store`.
- **Measure your own pipeline.** The real-channel run was ~2,000 requests to a small model - $1-1.5 and about 19 minutes. Less than a coffee.

## Run it

```bash
uv sync
uv run prov-lab run --config experiments/config.yaml --mock
uv run prov-lab report
```

Whole matrix in seconds, deterministic per seed, MIT: [P0rt/provenance-compaction-lab](https://github.com/P0rt/provenance-compaction-lab).

Two ways to point this at your own system now. `prov-lab audit` is the closing question as a command: ~20 lines of YAML - which fields your compaction preserves, which fields each gate reads, each gate's default polarity - and it prints the starvation table: which of your gates are deciding blind, and in which direction they'll fail. No simulation, no traces, five minutes. And `prov-lab run --trace your.jsonl` replays the whole harness over real agent logs: taint-derivation rules are YAML data, not code (tool status ≠ ok → taint, cache age over threshold → taint, and so on), the oracle is a full-provenance replay of the same trace, and the report tells you what it could and couldn't map. Synthetic trajectories are this experiment's honest limitation; replication on a real memory pipeline is the one result I can't produce alone.

Credits, which in this series means authorship: **Nazar Boyko** called both the score/lineage split and the min-fold recursion before a line of this code existed. **Max Quimby** asked the question that became a price tag. This part, like the ones before it, was co-written by the comment section.

So, the question for this thread: **what does your compaction actually preserve, relative to what your gates read?** `prov-lab audit` is that question as a command; `--trace` is the full version. Either way - post the table.

Part 6 is `attest()` - restoration semantics. Everything in this system can only lower an axis. What event is allowed to raise one, and who holds the authority to say so?
