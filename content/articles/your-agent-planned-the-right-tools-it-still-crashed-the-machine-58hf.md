---
title: Your Agent Planned the Right Tools. It Still Crashed the Machine.
slug: your-agent-planned-the-right-tools-it-still-crashed-the-machine-58hf
description: >-
  PeakBench separates logical planning from physical scheduling. Eight frontier
  models could recover dependencies yet still overload finite infrastructure
published: true
date: '2026-08-26T13:51:56Z'
updated: '2026-08-26T14:34:22Z'
readingTime: 6
tags:
  - ai
  - llm
  - devops
  - mlops
language: en
coverImage: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2F27501eb9fx1h8nz2d3d8.png
source: dev
sourceUrl: >-
  https://dev.to/p0rt/your-agent-planned-the-right-tools-it-still-crashed-the-machine-58hf
devId: 4495004
canonicalUrl: >-
  https://sergei-parfenov.com/blog/your-agent-planned-the-right-tools-it-still-crashed-the-machine-58hf/
---

Your agent needs four independent facts before it can approve a refund:

1. the order record,
2. the fraud score,
3. the customer's history,
4. the policy that applies.

It correctly sees that all four calls can run in parallel.

So it launches all four.

The order lookup is cheap. The policy search is cheap. The fraud model loads a large checkpoint. The history job scans two years of events. Together they cross the worker's memory limit, the container restarts, and the refund never happens.

**The plan was correct. The execution was not.**

Most agent benchmarks collapse those into one score.

A new preprint submitted on August 25, [PeakBench](https://arxiv.org/abs/2608.24509), argues that this hides an entire class of production failures: the agent may understand every dependency and still overload the machine that executes them.

> **TL;DR**
>
> - A dependency graph tells you what *may* run in parallel. It does not tell you what your machine can run safely.
> - Across eight tested models, planning accuracy had almost zero correlation with capacity violations on the same workflows.
> - Resource metadata helped, but model-generated schedules were not reliably safe for every model.
> - In production, let the model build the DAG. Let deterministic infrastructure enforce the resource envelope.

## The DAG is not the schedule

If step C needs the output of step A, C waits. If A and B are independent, the framework can run them concurrently.

That is a logical property. It says what *may* run at the same time.

It says nothing about what the machine can survive.

Two independent calls might each need 6 GB of memory on an 8 GB worker. Four browser sessions might fit logically but exceed a provider concurrency limit. Ten embedding jobs may be valid in parallel and still saturate their shared network connection.

PeakBench calls this the peak-load problem: runtimes translate logical independence into immediate execution while implicitly assuming infinite capacity.

When that assumption stays hidden, a crash gets blamed on “the agent.” The benchmark cannot tell you whether the failure came from reasoning, scheduling, or infrastructure.

## What PeakBench separates

The authors assembled roughly 1,200 MCP-compatible tools from about 130 servers and constructed 300 executable workflows:

- 150 easy,
- 100 medium,
- 50 hard.

The workflows run inside containers. The benchmark records data flow, perturbs execution order, and watches for failures. This produces an execution-grounded dependency graph instead of relying only on an annotator's guess.

In a manual audit of about 100 workflows, 94% of those graphs matched the auditors' optimal structure.

PeakBench then scores two jobs independently.

### 1. Logical planning

The model receives the task and tool descriptions. It must recover which calls are prerequisites and which may run concurrently.

The benchmark reports graph edit distance and edge F1.

### 2. Physical scheduling

The model receives the *verified* dependency graph, so planning ambiguity is removed. It only has to assign start times under small, medium, and large machine profiles.

The schedule is scored on:

- completion time,
- capacity violation area: how badly, and for how long, the schedule exceeds a resource limit,
- strict mean resource utilization: utilization that counts only while the schedule remains feasible.

That split is the useful contribution. A failed run no longer has to disappear into one end-to-end number.

## The result that matters

[PeakBench evaluated eight models](https://arxiv.org/abs/2608.24509) under one prompting and parsing protocol: GPT-5, o3, GPT-4.1, Claude Sonnet 4.6, GLM-5, Kimi-K2.5, DeepSeek-V4-Pro, and DeepSeek-V4-Flash.

GPT-5 was the strongest logical planner in the reported table:

- **Graph edit distance:** 0.42
- **Edge F1:** 0.839
- **Capacity violation area:** 3.698 for its resource-blind schedule

DeepSeek-V4-Flash recovered the graph less accurately:

- **Graph edit distance:** 0.81
- **Edge F1:** 0.733
- **Capacity violation area:** 3.458 once given the verified graph

That comparison is not a model ranking. The case-level result is more important.

Across all eight models, the correlation between edge F1 and capacity violations was almost zero. The reported coefficients ranged from roughly **-0.045 to 0.000**.

A model understanding a workflow's dependencies told you almost nothing about whether it would schedule that same workflow safely.

**Your planner benchmark is not a scheduler benchmark.**

## Resource data helped. It did not solve scheduling.

The authors added a Resource-Aware Scheduling Context, or RASC. For each tool call, the model sees estimated duration, average and peak CPU, peak memory, machine capacity, and verified dependencies.

No weights change. The model simply stops scheduling blind.

The aggregate trade-off is easier to read without a wide table:

- **Launch everything ASAP:** 8.62 s completion, 5.865 violation area, 0.080 safe utilization.
- **Run everything serially:** 15.19 s, 2.925 violation area, 0.097 safe utilization.
- **Best rule-based scheduler:** 9.13 s, 2.925 violation area, 0.141 safe utilization.
- **Best RASC result:** 9.11 s, 2.938 violation area, 0.165 safe utilization.

Blind parallelism was fastest and most dangerous. Serial execution reduced overload by paying almost twice the latency. Resource-aware context nearly matched the best rule-based violation score while producing higher safe utilization.

But the effect was model-dependent. RASC improved most models, not all. DeepSeek-V4-Flash slightly increased its violation area. Kimi-K2.5 and GPT-4.1 lost strict utilization even while finishing faster.

Resource metadata is necessary input. It is not an admission controller.

## What I would change in production

The tempting fix is another system-prompt sentence:

> Be careful with resources.

That is not an architecture.

I would make three artifacts explicit.

### 1. The planner emits a dependency graph

The planner decides which outputs are required and which calls are logically independent. It should not decide that every ready call starts now.

```json
{
  "steps": {
    "fraud": {"depends_on": []},
    "history": {"depends_on": []},
    "policy": {"depends_on": []},
    "decision": {
      "depends_on": ["fraud", "history", "policy"]
    }
  }
}
```

### 2. A scheduler owns physical execution

Give every tool a versioned resource profile:

```json
{
  "tool": "fraud_score@3.4.1",
  "duration_p95_s": 4.8,
  "cpu_peak_cores": 1.7,
  "memory_peak_mb": 6144,
  "network_slots": 1,
  "provider_concurrency": 4
}
```

Then enforce the envelope outside the model with queues, per-resource semaphores, rate-limit budgets, and backpressure.

The model may propose a schedule. Deterministic infrastructure should decide whether it is allowed to run.

### 3. The trace records what actually ran

A configured concurrency limit of four does not prove that an SDK did not add three hidden retries inside one call.

For every attempt, record:

- requested and actual start time,
- queue delay,
- resource-profile version,
- observed peak resources,
- retry and fallback attempts,
- the dependency state that made the call eligible,
- the limiter or scheduler decision.

Without that trace, a passing benchmark tells you what the agent intended to do, not what the runtime did.

## A production drill you can run this week

This is not a reproduction of PeakBench. It is a smaller test for your own runtime.

1. Pick one real workflow with at least two expensive independent calls.
2. Capture each tool's p95 duration, peak memory, peak CPU, and external concurrency limits.
3. Run the same workflow under three envelopes:
   - normal production capacity,
   - degraded or burst-constrained capacity,
   - a generous diagnostic capacity.
4. Compare three policies:
   - launch every ready call,
   - serialize every call,
   - enforce a resource-aware queue.
5. Report task correctness and resource feasibility separately.

A correct answer that violates the capacity envelope is not a pass. A safe schedule that serializes everything is not automatically good either.

The goal is maximum *safe* parallelism.

## Why the comments mattered

Comments on my previous harness article kept returning to the same missing fields: publish the action budget, retry policy, and actual route taken, not only the model and final score.

PeakBench made the operational half of that argument measurable.

That comment signal helped identify the question. It is not the evidence for the answer; the benchmark is.

An agent run is defined not only by the model, prompt, tools, and dependency graph. It is also defined by the machine profile and the scheduler that turns readiness into execution.

If those fields are absent, a successful plan can still become an outage-and the model will get blamed for a failure the runtime created.

## Limitations

PeakBench is a version-one preprint. Its workflows are synthesized, its capacity profiles are simulated, and the reported results should not be treated as measurements of your cluster.

The benchmark is best read as a diagnostic: it shows that logical planning and physical scheduling can fail independently. The exact numbers still need validation against real production traces.

## Sources & further reading

- [PeakBench paper](https://arxiv.org/abs/2608.24509)
- [PeakBench code repository](https://github.com/Czzzk/Staggering-the-Peaks)
