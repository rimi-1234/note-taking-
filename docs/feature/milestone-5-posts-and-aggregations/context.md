# Context - Milestone 5 - Posts and aggregations

**Goal:** The two aggregation scenarios from the PDF, each backed by an index, plus a script that proves no query in the API does a collection scan.

- Decisions 3 (Posts scope), 14 (interests view admin-only), 22 (explain script), 23 (index plan).
- PDF constraints: Scenario 1 uses exactly one `collection.aggregate()` call and nothing else; Scenario 2 uses a single pipeline with `$lookup`.
- Depends on: Milestones 1 and 2.
