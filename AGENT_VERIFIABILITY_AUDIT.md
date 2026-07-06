# Agent-Verifiability Audit: Omega Strikers Tracker

An audit of how well this codebase's architecture supports safe, automated
verification of AI-generated changes — independent of who or what wrote the code.

**Codebase profile:** Next.js 14 (App Router) + TypeScript (`strict: true`), Neon
serverless Postgres, React-Bootstrap UI. ~6,100 LOC of app code. **Zero tests,
zero CI workflows.** Business logic lives predominantly in raw inline SQL strings
rather than in TypeScript.

Ratings are Low / Medium / High.

---

## 1. Locality of Effect — Low

Blast radius is large and hard to bound because the "unit of change" is usually a
giant inline SQL string embedded inside a React server component, and the data
contract between SQL and the render layer is entirely implicit (untyped row
objects). A change to a column name, a `GROUP BY`, or a `CASE` expression can
silently alter every downstream `.map()` in the same file with no compile-time
signal. There is also a shared, untyped data access primitive (`db()`) that every
page funnels through, so its behavior is a global dependency.

**Example:** `src/app/players/page.tsx` is **1,599 lines**, most of it four
overlapping ~150-line SQL CTEs (`combinedStats`, `forwardStats`, etc.) that each
recompute `winRate` with the same `CASE WHEN m."team1Won"...` snippet. Editing the
win-rate definition means finding and correctly editing that expression in ~6
places; miss one and the numbers silently diverge with no error.

## 2. Separation of Pure Logic from Effects — Low

There is almost no boundary. Server components interleave I/O (`await db(...)`),
business logic (all in SQL), and rendering in the same function body. The server
action `insertMatch` mixes validation, DB writes, and cache invalidation
(`revalidatePath`). The small amount of genuinely pure logic that does exist is the
exception, and it's the only thing testable without standing up a database.

**Testable-without-mocking-the-world estimate: well under 10%.** The pure islands
are `formatDuration` (`players/page.tsx:14`), `calculateWinRate`
(`api/calculate-win-rate/route.ts:5`), and `getRankBalanceLabel`
(`constants/rankBalance.ts`). Everything else requires a live Postgres with
representative data.

**Example:** `calculateWinRate(totalMatches, totalWins)` is a clean, deterministic,
trivially unit-testable function — but the actual win-rate computation it supports
is done in SQL, so the pure function only covers the final division while the
meaningful logic (the join/`CASE`/aggregation) stays in the untestable layer.

## 3. State Model Explicitness — Low

State is ad hoc and loosely typed. Client state is `useState` over `any[]` and
`(string | undefined)[]`; server-derived rows are untyped `any`. Domain concepts
that should be enumerable unions are stringly-typed or number-keyed maps. Invalid
states are freely representable.

- `STRIKERS` is `string[]`, not a union — nothing prevents a striker value the DB
  has never seen.
- `RANKS` is an object keyed `0..22` but the value shape is untyped; ranks flow
  through the system as raw form strings.
- Match state has no model: a "match" is six `INSERT`s into `MatchPlayer` with
  role/goalie encoded by convention (`playerNumber % 3 == 0`,
  `teamNumber = playerNumber >= 4 ? 2 : 1`).

**Example:** `insertMatch.ts:29` guards `scoreA != 3 && scoreB != 3`, but
`scoreA`/`scoreB` come from `formData.get(...)` as **strings**, so `scoreA === scoreB`
and `scoreA === 0` are string-vs-number comparisons and `scoreA > scoreB` is
lexicographic. The "valid match" invariant lives in fragile runtime string checks,
not the type system.

## 4. Determinism & Reproducibility — Low

The core outputs are a pure function of **live database state**, which is
unversioned and unseeded, so "same inputs → same outputs" cannot be reproduced
without a fixture DB — and none exists. Additional non-determinism leaks in
unguarded: `new Date()` for match dates (`create/page.tsx:283`),
`export const revalidate = 1` cache timing, and `console.log` side effects through
request handlers. None of it is isolated behind a clock/RNG seam.

**Example:** `src/util/db/db.ts` instantiates `neon(process.env.DATABASE_URL)` on
every call and returns raw rows. There is no repository interface, no in-memory
fake, no dependency injection — so no page or route could run in a replay/simulation
harness without a real Postgres endpoint.

## 5. Testability Surface — Low

There is no test suite and the structure actively resists one. Property-based
testing has almost no surface: the invariants that matter (win-rate symmetry, stat
aggregation correctness, "exactly one goalie per team") are enforced in SQL or in
one-off client checks, not in checkable contracts.

- Win-rate should satisfy `teamA_winrate + teamB_winrate ≈ 100` and stay in
  `[0,100]` — never asserted anywhere.
- "Exactly one goalie per team" is validated only in `create/page.tsx` client
  `handleSubmit`; the server action `insertMatch` and the DB enforce **nothing**.

**Example (latent bug a test would catch):** `getRankBalanceLabel` in
`constants/rankBalance.ts` has overlapping/gapped ranges — `0.34` matches both
"Perfectly Balanced" (`max: 0.34`) and "Slightly Uneven" (`min: 0.34`), and values
in `(1, 1.01)` fall through to "Unknown." A single boundary property test would
surface this; today nothing does.

## 6. Change Safety — Low

An agent modifying this code with imperfect understanding is very likely to silently
break something. Type-level guarantees are largely defeated: pervasive `any`,
explicit `@ts-ignore` (`create/page.tsx:32,36`), and the fact that the
highest-value logic (SQL) is opaque strings the compiler never inspects.
Correctness is only knowable by running the full app against real data.

**Example:** `insertMatch.ts` wraps its writes in
`try { ... } catch (error) { console.error(...) }` and then **falls off the end
returning `undefined`** on failure. The caller does `if (response?.error)` —
`undefined?.error` is falsy — so a DB failure renders the **success** message to the
user. An agent "improving" the query would get a green screen while silently
dropping data.

## 7. Human-Judgment Surface — Medium (not sandboxed)

The objectively-checkable layer and the subjective layer are **not** separated — but
the app is data-display, so the subjective surface is genuinely small (Bootstrap
defaults + inline styles; no game-feel/animation system to protect). Styling is done
with inline `style={{...}}` objects scattered through JSX, mixed directly into the
components that hold data-shaping logic. A "make it prettier" tweak edits the same
files/functions as the data logic, with no boundary preventing an aesthetic change
from touching a `.reduce()` that shapes draft data (`DraftTool.tsx:48-89`).

---

## Top 3 Structural Risks

1. **Business logic lives in opaque SQL strings the compiler can't see, with
   untyped row results.** The most consequential computations (win rates,
   per-minute stats, counters) are inline SQL returning `any`. An agent editing a
   query gets zero type feedback and no test coverage — the largest source of
   silent, data-corrupting breakage. (`players/page.tsx`, every `api/*/route.ts`.)

2. **Errors are swallowed and invalid states are representable.** `insertMatch`
   returns `undefined` on failure and the UI reports success; scores are compared as
   strings; "one goalie per team" is enforced only in client JS. Broken changes
   surface as wrong numbers or false-success, not exceptions.
   (`actions/insertMatch.ts`.)

3. **No test suite, no CI, no reproducible data fixture, and a live-DB-coupled data
   layer with no seam.** There is nothing an automated verifier can run to gain
   confidence. Every change's correctness is only knowable by manual inspection
   against production data.

## Top 3 Highest-Leverage Refactors (by effort-to-impact)

1. **Add a CI gate + a repository seam + a handful of fixture-backed tests (lowest
   effort, high impact).** Add a GitHub Actions workflow running `tsc --noEmit` and
   `next lint` on PRs. Then wrap `db.ts` behind a typed interface so a fixture/
   in-memory implementation can be injected, unlocking deterministic tests. Start by
   pinning `calculateWinRate`, `formatDuration`, and `getRankBalanceLabel` (which
   will immediately expose the boundary bug) with unit tests.

2. **Lift the domain into types and pure functions; make invalid states
   unrepresentable (medium effort, high impact).** Turn `STRIKERS`/`ARENAS`/rank
   keys into string-literal union types; define `Match`/`MatchPlayer`/`PlayerStats`
   interfaces as the SQL↔render contract; move win-rate and stat aggregation out of
   duplicated SQL into a single pure TypeScript module operating on typed rows.

3. **Fix the effect boundary in writes and harden error handling (medium effort,
   targeted impact).** Validate `insertMatch` input with a real schema coercing
   scores to numbers, enforce the "one goalie / valid score" invariants server-side,
   and make the action return a discriminated `{ ok: true } | { ok: false; message }`
   result so a swallowed error can never render as success.

---

**Overall:** Six of seven dimensions rate **Low**. The architecture is optimized for
one-evening iteration speed, and its verifiability weaknesses are concentrated in
three reinforcing choices: logic-in-SQL, pervasive `any`, and no test/CI/fixture
infrastructure. The encouraging part is that the highest-leverage fix (Refactor #1)
is also the cheapest — a CI typecheck gate and a repository seam are a weekend's
work and would move Change Safety and Determinism materially before any deeper
restructuring.
