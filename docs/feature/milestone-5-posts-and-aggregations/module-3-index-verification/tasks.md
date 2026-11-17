# Tasks - Index verification

- [x] [backend] `scripts/explain.ts`: list of every query shape used by the API
- [x] [backend] Walk each winning plan (including `$lookup` sub-plans) and collect stages and index names
- [x] [backend] Fail on `COLLSCAN`; print a summary table
- [x] [backend] Compare actual indexes against the expected list
- [x] [test] Run the script in the test suite against the memory server
