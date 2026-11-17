# Tasks - Index verification

- [ ] [backend] `scripts/explain.ts`: list of every query shape used by the API
- [ ] [backend] Walk each winning plan (including `$lookup` sub-plans) and collect stages and index names
- [ ] [backend] Fail on `COLLSCAN`; print a summary table
- [ ] [backend] Compare actual indexes against the expected list
- [ ] [test] Run the script in the test suite against the memory server
