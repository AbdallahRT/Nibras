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
