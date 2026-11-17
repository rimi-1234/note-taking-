# Context - Frontend user pages

**Decisions applied:** 2, 3, 12, 20.

- Loading and error states: a simple "Loading..." line and a red error message from `error.message`.
- No optimistic updates: after each save the page re-fetches the current page.
