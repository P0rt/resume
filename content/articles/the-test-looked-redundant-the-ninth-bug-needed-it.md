---
title: The Test Looked Redundant. The Ninth Bug Needed It.
slug: the-test-looked-redundant-the-ninth-bug-needed-it
description: >-
  A 5/5 mutation score missed an empty-filter regression. A manual catalogue
  reached 8/8, then a ninth candidate exposed why a redundant-looking test mattered.
published: true
date: '2026-09-15T13:06:15Z'
updated: '2026-09-15T13:06:15Z'
tags:
  - ai
  - testing
  - python
  - agents
language: en
source: local
sourceUrl: ''
canonicalUrl: https://sergei-parfenov.com/blog/the-test-looked-redundant-the-ninth-bug-needed-it/
coverImage: https://sergei-parfenov.com/assets/the-test-looked-redundant-the-ninth-bug-needed-it.png
coverAlt: >-
  An engineer studies eight green-lit test modules while a separate inspection
  lamp reveals a red mechanical beetle outside their test area.
---
On a catalogue of eight implementations, a repeated-status test added no unique detection. Every candidate it rejected was already rejected by another check.

I added a ninth implementation. The repeated-status test became the only check that caught it.

That changes how I would apply the recommendation at the end of [my previous article on AI-generated tests](https://sergei-parfenov.com/blog/ai-generated-tests-can-make-coding-agents-worse/). I suggested reviewing a test by asking which plausible wrong implementation it rejects. The comments made that question executable: run the suite against a catalogue of mistakes and count the rejections.

The approach is useful. Its denominator still needs review.

I have put the [code, checks, mutation diffs, and recorded results on GitHub](https://github.com/P0rt/mutation-score-boundaries/tree/19c73b446009e91f10f220dac61a30f96cc1ba5d). These are local runs of a deliberately constructed Python fixture, not measurements of a coding agent or a replication of ExecCritic. One part reproduces a commenter's result with matching Python and tool versions. Another reconstructs prose-described variants whose original files I do not have. The ninth candidate is my own deliberate counterexample.

## Five out of five did not distinguish the suites

The previous example was an order filter with three rules: omitting the filter or passing `None` returns all orders; an empty list returns none; a list of statuses selects matching orders.

The correct implementation is small:

```python
ORDERS = [
    {"id": 1, "status": "paid"},
    {"id": 2, "status": "pending"},
]

def filter_orders(orders, statuses=None):
    if statuses is None:
        return list(orders)
    return [order for order in orders if order["status"] in statuses]
```

Changing the condition to `if not statuses` introduces the regression. Python treats both `None` and `[]` as falsey, so the function returns everything for an empty filter. Two tests—default call and paid-status selection—accept both versions. The empty-list assertion separates them.

[Vinh Nguyen ran mutmut against this fixture](https://dev.to/vinhnguyenthanhdn/comment/3ej62) and reported a boundary I had left too easy to miss: the generated candidates did not include that condition substitution.

I reproduced the comparison with **CPython 3.14.6 and mutmut 3.7.0**. The correct implementation scored **5/5** with the two tests and **5/5** after adding the empty-list test. The wrong implementation also scored **5/5** with the two tests. With all three, the wrong implementation failed its baseline, so it received no mutation score.

For the correct function, the tool inverted the identity comparison, replaced `list(orders)` with `list(None)`, altered the `"status"` key in two ways, and inverted membership. It never replaced the identity comparison with a truthiness test. Several generated candidates raised exceptions; the suite detected those, too. The exact diffs and failure categories are recorded.

The score correctly described all five candidates the tool had generated. It could not distinguish these two suites because both rejected that entire set.

Following [Vinh's second comparison](https://dev.to/vinhnguyenthanhdn/comment/3ek7h), I added the missing truthiness candidate by hand. Against the same six candidates, the two-test suite rejected **5/6** and the three-test suite rejected **6/6**. All of the new distinction came from the candidate derived from the empty-filter requirement.

This observation is specific to the fixture and operator configuration. It gives no estimate of how often mutation testing misses important distinctions in other code.

## Eight candidates made another test look unnecessary

[howcani described a broader catalogue](https://dev.to/howcani_howcani_77e786a89/comment/3ejm6): eight alternatives involving the filter condition, ignored filtering, an incorrect comparison, list identity, output order, repeated selectors, and changes to the input.

I reconstructed those alternatives with fresh input for each check and independent expected values. The cumulative rejections matched the reported progression:

- The original two checks rejected **3/8**.
- Adding the empty-list check rejected **4/8**.
- Requiring a new list object brought it to **5/8**.
- Adding an order-sensitive check brought it to **7/8**.
- Checking that the caller's input remained unchanged brought it to **8/8**.

Those matching counts are not a blind replication. The descriptions and counts informed the reconstruction. Exact inputs and implementation choices matter, and the original files were unavailable.

One reconstructed candidate iterates over requested statuses first, then orders. That can both reorder the result and duplicate orders when a status appears twice. My order probe catches it. So does this check:

```python
assert f(ORDERS, ["paid", "paid"]) == [ORDERS[0]]
```

Here, `f` is the candidate being evaluated. Once the order probe is present, the repeated-status check adds no unique rejection among those eight candidates. It is redundant for separating that finite set. In the discussion, I had agreed with adding assertions only when they reject a surviving candidate.

The stronger interpretation of that rule does not survive the next function.

## The ninth candidate preserves order and duplicates matches

Here is the additional implementation:

```python
def duplicate_only(orders, statuses=None):
    if statuses is None:
        return list(orders)
    return [
        order
        for order in orders
        for _ in range(statuses.count(order["status"]))
    ]
```

For unique requested statuses, it behaves like the correct filter. It preserves input order, creates a new list, leaves the input unchanged, and handles both `None` and `[]` correctly. For a repeated status, it repeats the matching order.

It passes all six checks that collectively rejected the first eight candidates. The repeated-status check rejects it.

With the ninth candidate included, the six-check result is **8/9**. Retaining the seventh check makes it **9/9**.

![Mutation results and a matrix showing which checks reject each reconstructed candidate, including the separately added ninth variant](https://raw.githubusercontent.com/P0rt/mutation-score-boundaries/19c73b446009e91f10f220dac61a30f96cc1ba5d/results/figure.png)

The last row is the added challenge. Its only rejection comes from the repeated-status column.

I constructed this candidate specifically to separate behaviors that the earlier loop combined. It is not a held-out sample, evidence of bug frequency, or a reason to report 9/9 as general coverage. It demonstrates a narrower point: **a check's lack of a unique rejection can be a property of the catalogue.**

The smaller catalogue contained no candidate that duplicated matches while preserving order. Its apparent redundancy inherited that omission.

## My original runner also changed the count

There was another awkward result. Running the same reconstructed catalogue through the untouched runner from my published archive produced **4/8 and 5/8**, instead of 3/8 and 4/8.

The extra rejection came from the candidate that builds the correct return value and then appends a sentinel to the input. In simplified form:

```python
def append_after_copy(orders):
    result = list(orders)
    orders.append({"id": -1, "status": "sentinel"})
    return result
```

My original default check compares the function's result with `ORDERS`. That expected value is the same mutable list passed into the function. By the time equality is evaluated, the expected list has grown. The returned copy has not. The assertion fails.

With an independent before-call snapshot as the expected output, the output check passes. A separate input-preservation assertion catches the side effect when that property is required.

The original check happens to reject this candidate. But the two runners are measuring different things. A count without the expected-value construction and state-isolation rules is missing part of its method.

This discrepancy does not show that howcani's count was wrong; I do not have his precise implementation and test harness. It shows why publishing the functions alone would not make my reconstruction reproducible.

## Some of the catalogue expanded the contract

The original three rules described which orders should be returned. They did not separately promise a new outer list, stable ordering, or unchanged input. Those may be appropriate requirements. The brief did not settle them.

I checked a narrow interpretation: preserve the membership and multiplicity of the matching orders, without specifying their order or object ownership. Repeating a selector does not create another order under this interpretation.

Across a finite domain of **1,134 calls per function**, four alternatives—returning an alias, reversing the output, sorting the input, and appending after constructing the result—returned the correct multiset on every call. The domain included empty inputs, omitted and explicit `None` filters, repeated selectors, unknown statuses, and reversed input order. The full setup is in the [experiment report](https://github.com/P0rt/mutation-score-boundaries/blob/19c73b446009e91f10f220dac61a30f96cc1ba5d/docs/experiment.md).

Those functions can still be bad choices for a real caller. Mutating input can corrupt later calls. Order or ownership may be an established compatibility promise. Passing a one-call, finite-domain check does not establish product correctness.

The implication for the catalogue is specific: attach a requirement to each candidate before labeling its behavior a bug. `return orders` violates a new-list promise if the product makes one. The fact that my reference implementation uses `list(orders)` does not, on its own, establish that promise.

## Keep the regression; keep questioning the catalogue

For an agent repair loop, I would keep the review question from the previous article and narrow the pruning rule.

Start with a written requirement and its supported inputs. Give each candidate an executable counterexample and a reviewed expected result. Use the candidate matrix to discover missing distinctions. Keep accepted regression checks stable while the implementation changes.

If a test adds no unique rejection, inspect the overlap before deleting it. Two tests may reject the same candidate because that candidate bundles two independent mistakes. Ask whether one mistake can occur without the other. Here, an outer loop over selectors bundled ordering and duplication. Changing the loop structure separated them.

This does not mean retaining every test forever. A finite catalogue can support pruning when the intended objective is discrimination within that catalogue. Removing a regression check tied to a distinct requirement needs a broader argument—such as the remaining checks establishing the same behavior over the supported inputs.

I would carry that distinction into the same record as the score: contract revision, candidate revision, probes, expected values, environment, and observed failures. It extends the concern in [my earlier piece about harness-dependent scores](https://sergei-parfenov.com/blog/the-model-scored-30-the-harness-scored-100-which-one-did-you-benchmark-3mp4/): the number only describes the system that produced it.

The [repository](https://github.com/P0rt/mutation-score-boundaries) includes the original archive, four mutation-test configurations, saved generated functions, reconstructed candidates, the ninth challenge, and commands for replaying the evidence. The quick verification uses only Python's standard library; the full mutation run uses the recorded dependency versions.

The repeated-status requirement did not change when I added the ninth function. The catalogue finally contained a way to violate it without also violating the order check. That is the reason I would keep the test.
