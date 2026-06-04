# Internal contest flow (Bruno)

Run these requests **in order** with the **local** environment and a valid `token` (from `npm run dev:session`).

| Step | Request                               | Sets variable                                  |
| ---- | ------------------------------------- | ---------------------------------------------- |
| 1    | `06-problems/Create Problem`          | `problemId`                                    |
| 2    | `04-contests/Create Contest`          | `contestId`                                    |
| 3    | `04-contests/Register for Contest`    | —                                              |
| 4    | `05-contest-actions/Submit Solution`  | needs `problemId` + `contestId` from steps 1–2 |
| 5    | `04-contests/Get Contest Detail`      | check `standings`                              |
| 6    | `05-contest-actions/List Submissions` | —                                              |
| 7    | `08-ranking/My Ranking`               | —                                              |

Optional HackerRank metadata:

1. `07-integrations/HackerRank Connect` — set `hrHandle` in environment first
2. `07-integrations/Verify Account` — `host` = `hackerrank`
3. `07-integrations/List Accounts` — inspect `metadata.skills`

Socket.io (not in Bruno): `CONTEST_ID=<id> npm run smoke:socket`

# Course assignment flow (Phase 6)

Run with instructor `token` first, then switch to student token for submit/evaluate.

| Step | Request | Sets variable |
| ---- | ------- | ------------- |
| 1 | `10-courses/Create Course` | `courseId` |
| 2 | `10-courses/Enroll Course` | — (student token) |
| 3 | `11-assignments/Create Assignment` | `assignmentId` |
| 4 | `11-assignments/Add Test Case` | — |
| 5 | `11-assignments/Submit Assignment` | — (student token) |
| 6 | `11-assignments/Evaluate Assignment` | check `testResults` |

Docker execution: set `EXECUTOR_ENABLED=true` and pull images via `docker compose -f docker-compose.executor.yml --profile executor pull`.
