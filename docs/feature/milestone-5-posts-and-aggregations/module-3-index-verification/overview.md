# Overview - Index verification

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds `npm run explain`, which runs every query and aggregation the API uses with `explain()`, prints the winning plan and index for each, and exits with an error if any plan contains `COLLSCAN`. It also checks the database holds exactly the indexes declared in code.

## What changes

| File | Change |
| --- | --- |
| `scripts/explain.ts` | New |
| `package.json` | Add `explain` script |
| `tests/explain.test.ts` | New |

## How it works

```mermaid
flowchart TD
    START(["npm run explain"]) --> SEED["insert sample data"]
    SEED --> LOOP["for each API query shape"]
    LOOP --> EX["run with explain('executionStats')"]
    EX --> WALK["walk plan tree incl. $lookup"]
    WALK --> C{"COLLSCAN found?"}
    C -- yes --> FAIL["print offending query<br/>exit 1"]
    C -- no --> ROW["record stage + index name"]
    ROW --> LOOP
    LOOP --> IDX["compare db indexes vs expected list"]
    IDX --> REPORT["print summary table, exit 0"]
```

## Where it fits

Part of [Milestone 5 - Posts and aggregations](../overview.md).
