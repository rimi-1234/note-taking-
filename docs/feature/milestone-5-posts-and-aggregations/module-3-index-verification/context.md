# Context - Index verification

**Decisions applied:** 22, 23.

**Exceptions that are allowed to skip an index (by design):**
- `estimatedDocumentCount()` reads collection metadata, no scan.
- The last-admin `countDocuments({ role: 'admin' })` runs only on admin delete or demote; see milestone 4 context.

The script reports these explicitly so reviewers can see the reasoning instead of a silent gap.
