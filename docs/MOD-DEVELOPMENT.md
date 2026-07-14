# OSCapture mod — development reference

How the game-client capture mod works and how to extend it. The mod is **vendored in
this repo at `mod/OSCapture/`**, and the game's mod folder is a directory **junction**
pointing at it — so editing here == editing the live mod, and git tracks changes:

```
repo/mod/OSCapture/                         (the game folder junctions to this)
├─ Scripts\main.lua    ← all the logic (tracked)
├─ enabled.txt         ← presence tells UE4SS to load the mod (tracked)
├─ config.txt.sample   ← ENDPOINT + TOKEN template (tracked)
└─ config.txt          ← real per-machine config, holds the token (GITIGNORED)

game …\Binaries\Win64\Mods\OSCapture  ──junction──▶  repo\mod\OSCapture
```

Re-create the junction after a game reinstall (no admin needed):
`mklink /J "…\Win64\Mods\OSCapture" "…\repo\mod\OSCapture"` and drop your real
`config.txt` back in (it's gitignored, so not restored by git).

Data flows: **game process → UE4SS Lua reads game objects at match end → builds JSON
→ `curl.exe` POSTs to `/api/ingest` → tracker DB**. No companion process.

---

## 1. The runtime: UE4SS

- **UE4SS v3.0.1** (Unreal Engine Scripting System) injects into
  `OmegaStrikers-Win64-Shipping.exe` via a `dwmapi.dll` proxy DLL sitting next to the
  exe in `Win64\`. The game is **UE 5.1.0** with **no anti-cheat** — modding is safe.
- Our mod is a single Lua script UE4SS runs in-process. It has full read access to
  live `UObject`s through UE4SS's reflection API.
- **Console + logs:** UE4SS opens a console window on game launch. `print(...)` from
  Lua goes there and to `UE4SS.log` in `Win64\`. This is your primary debugging
  surface — there's no debugger, you `print` and read.
- **Reload loop:** UE4SS reloads Lua mods without restarting the game via its hotkey
  (default `Ctrl+R` if `RegisterKeyBind` re-registration is clean) — but hooks and
  keybinds can double-register on reload, so for anything touching `RegisterHook` the
  reliable loop is **restart the game**. Iterating on pure `buildRecord` logic +
  pressing **F9** (manual capture) is fine without restart.

### Working config
- `Win64\` is the **current working directory** at runtime. All relative `io.open`
  paths (`OSCapture_payload.json`, `OSCapture_dump.txt`, `Mods/OSCapture/config.txt`)
  resolve there.
- `os.execute` **is available** (not sandboxed out) — that's how we shell out to
  `curl.exe`. `io.open`, `math.random`, `os.time` all work.

---

## 2. UE4SS Lua API — the pieces we actually use

| Call | What it does |
|---|---|
| `FindAllOf("ClassName")` | returns a Lua array of all live instances of a UClass (by short name, no `/Script/…`). Returns `nil` or empty if none. |
| `FindFirstOf("ClassName")` | first live instance, or `nil`. |
| `StaticFindObject("/Script/Pkg.Default__Class")` | fetch a specific object by full path — used to get the **CDO** (class default object) for calling static-style functions, e.g. `AkGameplayStatics`. |
| `RegisterHook("/Script/Pkg.Class:Function", fn)` | fire `fn(self, param1, param2, …)` whenever that UFunction runs. Params come in **wrapped** (see `unwrap`). Only works on `UFunction`s the engine actually calls through reflection. |
| `RegisterKeyBind(Key.F9, fn)` | bind a hotkey. `Key.*` enum provided by UE4SS. |
| `obj:IsValid()` | always guard before touching a `UObject` — stale pointers exist. |
| `obj:GetFName():ToString()` | the object's FName as a string (used to read `TrainingId`, event names, etc.). |
| `obj[PropertyName]` | **property access by reflection** — reads any UPROPERTY. Returns nested UObjects, wrapped values, or arrays. Wrap in `pcall`; not every name exists on every build. |
| `obj:Method(args)` | call a UFUNCTION, e.g. `ps:IsGoalie()`, `pc:IsLocalController()`, `statics:PostEventByName(...)`. |

**Golden rule:** everything reflective can throw. The mod wraps every access in `pcall`
via the helpers below, so a missing field degrades to `nil` instead of crashing capture.

### The mod's helper layer (top of `main.lua`)
- `s(v)` → safe stringify (calls `:ToString()` on userdata, else `tostring`; `"<err>"`
  on failure, `"nil"` for nil).
- `nameOrNil(v)` → `s(v)` but collapses `"nil"/"None"/""/"<err>"` to real `nil`.
- `num(v)` → `tonumber` or `0`.
- `m(obj, "Prop")` → **pcall'd property read**; `nil` on any failure. This is the
  workhorse — chain it: `m(m(gs, "CurrentMapData"), "Name")`.
- `unwrap(p)` → hook params arrive as a wrapper userdata; `p:get()` yields the real
  object. Use on every `RegisterHook` parameter.
- `eachArray(arr, fn)` → iterate a UE `TArray` safely; tries `arr[i]` then `arr:get(i)`,
  reads `#arr` for length. Returns count.

---

## 3. Discovering game data (how we found the fields)

You cannot guess UPROPERTY names — you dump them.

1. **CXX header dump (the map of everything):** in the UE4SS console press **`Ctrl+H`**.
   UE4SS writes C++ headers of every reflected class to
   `Win64\CXXHeaderDump\`. The useful ones for this game:
   - `Prometheus.hpp` — the game's own classes (`APMGameStateBase`, `APMPlayerState`,
     `FPMMatchEventLog`, `FPMFinalScore`, `UPMTrainingData`, `UPMCharacterData`, …).
     "Prometheus" is Omega Strikers' internal codename — **all game types are `PM*`**.
   - `Prometheus_enums.hpp` — enums (`EPMCharacterRole`, etc.).
   - `CoreUObject.hpp`, `Engine.hpp` — base UE types.
   - `AkAudio.hpp` — Wwise/audio (`UAkGameplayStatics`, `UAkAudioEvent`).
   Open these and grep for a concept (e.g. `MatchEventLog`, `Banned`, `Rating`) to find
   the exact struct + field names and types.

2. **Live object inspection:** `FindAllOf("PMPlayerState")`, then loop and `print` the
   property names/values you're curious about. Fields that read `<err>` or `nil` live
   don't exist or aren't reflectable on this build — pivot to another source (see
   gotchas: FDateTime, role enum).

3. **The dump file (`OSCapture_dump.txt`):** `formatReadable()` writes a human
   snapshot of every capture. First stop when a value looks wrong after a match.

---

## 4. The data model — where each field comes from

The **source of truth is `APMGameStateBase.MatchEventLog`** (`FPMMatchEventLog`) — a
replicated struct present in **all modes including customs**. It's an *event log*, not a
box score: you **derive stats by counting events**.

### From `PMGameState` (`gs`)
| Field | Path |
|---|---|
| `game_id` | `gs.GameId` — dedup key |
| `map` | `gs.CurrentMapData.Name` |
| `terrain` | `gs.CurrentTerrainData.Name` |
| `mode` | `gs.CurrentFormatData.Name` |
| `duration` | `gs.ReplicatedWorldTimeSeconds` (fallback `gs:GetServerWorldTimeSeconds()`) — **total session incl. draft**, see gotchas |
| `bans` | `gs.BannedCharactersData.TeamOneBannedCharacter.InGameName` / `TeamTwo…` |

### From `MatchEventLog` (`mel`) — counted
| Stat | Source array/field | How |
|---|---|---|
| striker + team | `CharactersSelected[]` | `.CharacterId`, `.SelectingTeamNumber`, keyed by `.SelectingPlayerId` |
| winning team | `WinningTeam` | scalar |
| MVP | `FinalScore.MatchMVP` | account id |
| sets | `FinalScore.Sets[]` | `.WinningTeam`, `.TeamOneGoals`, `.TeamTwoGoals` |
| goals / assists | `GoalsScored[]` | `+1` to `.CreditedPlayerId` if `bHasCreditedPlayer`; `+1` assist per id in `.AssistingPlayerIds` |
| saves | `GoalsSaved[]` | `+1` to `.DefendingPlayerId` |
| knockouts | `CharactersKnockedOut[]` | `+1` to `.InstigatingPlayerId` |
| damage/redirects/shots/orbs | `PlayerMatchEvents[]` | nested `.PlayerMatchEvents` summary: `DamageDoneToPlayers`, `RedirectRock`, `HitRockIntoGoalArea`, `PowerUpsPickedUpCount` |
| awakenings | `TrainingsSelected[]` | per `.Round`, iterate `.SelectedTrainings[].TrainingId` (fname `TD_…`) |

Players are keyed by **account id** (`SelectingPlayerId` / `PlayerId` = the game
account GUID). `pget(id)` lazily creates the per-player accumulator.

### Enriched from live `PMPlayerState[]` (per-player, only reliable for data your client sees)
| Field | Path |
|---|---|
| username | `ps.PMDisplayName` |
| striker name | `ps.ChosenCharacterData.InGameName` |
| role | `ps:IsGoalie()` → `"goalie"/"forward"` (method, not the enum — see gotchas) |
| account id | `ps.PMPlayerId` |
| rank/MMR | `ps.GamePlayerInfo.WinRatingUpdate.{RatingChangeAmount,UpdatedRating,PreviousTierId,UpdatedTierId}` — **local-player-only**, see gotchas |

### Awakening name resolution
`TrainingsSelected` gives a `TrainingId` FName like `TD_GlassCannon`. To get the
display name we build a lookup once per capture: `FindAllOf("PMTrainingData")` →
`td:GetFName():ToString()` → `td.InGameName`. Icons are matched on the display name in
`src/constants/awakeningIcons.ts` on the web side.

---

## 5. Adding a new captured field — recipe

1. **Find the source.** `Ctrl+H`, grep the `.hpp` for the concept, or `FindAllOf` +
   `print` live. Confirm it reads non-`nil` **in the mode you care about** (many fields
   are Ranked-only or local-player-only).
2. **Read it** with the `m()` chain inside `buildRecord`, coercing via
   `nameOrNil`/`num`. Counting an event? add an `eachArray(m(mel, "SomeEvents"), …)`
   block. Per-player? add it to the `pget(id)` accumulator shape and set it in the
   PlayerState enrich loop.
3. **Add it to the JSON `rec`** (top-level or on the player table). The JSON encoder
   handles nesting; empty arrays encode `[]`, keyed tables encode as objects.
4. **Show it in the dump** (`formatReadable`) so you can eyeball it.
5. **Ingest side:** teach `src/app/api/ingest/route.ts` to read the new key and write
   it. If it's a new column, add a migration in `migrations/` (idempotent `.sql`, next
   number in sequence) and apply it to the VPS DB (see project `CLAUDE.md` for the
   `docker postgres:16` psql invocation).
6. **Surface it** in the relevant page under `src/app/` (match page, player page, …).
7. **Test:** F9 after a match (or play one) → check console line, `OSCapture_dump.txt`,
   then the DB row, then the page.

---

## 6. Transport & side effects

- **Upload:** `curl.exe -s -m 12 -X POST -H "x-ingest-token: TOKEN" --data-binary
  "@OSCapture_payload.json" ENDPOINT`, launched detached via
  `os.execute('cmd /c start "" /b …')` so the game thread never blocks if the server is
  slow/down. The `@file` is **relative** (resolves in `Win64\`) to sidestep
  spaces-in-path quoting.
- **Config:** `loadConfig()` reads `Mods/OSCapture/config.txt` (`KEY=VALUE`, `#`
  comments) and overrides `ENDPOINT`/`TOKEN`. Missing file → compiled defaults. The
  load line prints `config=… endpoint=…` so you can confirm it took.
- **Sound cue:** Wwise via the `AkGameplayStatics` CDO:
  `StaticFindObject("/Script/AkAudio.Default__AkGameplayStatics"):PostEventByName(name,
  actor, false)`. `PostEventByName` (string) works; `PostEvent` (needs a
  `UAkAudioEvent` + delegate param) did **not**. **F7** plays a random loaded
  `AkAudioEvent` and prints its name — that's the sound-browser used to pick the two
  event names in `SOUND_EVENTS`.

---

## 7. Triggers

- **Auto:** `RegisterHook("/Script/Prometheus.PMGameStateBase:MatchCompleted_Multicast",
  fn)` — fires at match end in every mode. The completed log arrives as the multicast
  **param** (`unwrap` it), which is more reliable than re-reading `gs.MatchEventLog`.
- **F9:** manual capture (reads `gs.MatchEventLog` live) — the iterate-without-restart path.
- **F7:** sound browser (see above).

---

## 8. Gotchas / lessons (things that cost time)

- **Never hardcode striker/identity.** An early version guessed strikers from a code
  table and mislabeled them. Always read `InGameName` / `PMDisplayName` live from game
  objects.
- **Awakenings live in `SelectedTrainings[].TrainingId`,** not `TrainingIds` (the mod
  keeps a fallback to the latter but the former is correct).
- **Role: use `ps:IsGoalie()`,** not the `EPMCharacterRole`/`AssignedRole` enum — the
  enum defaulted wrong in bot matches. `role_raw` is kept only for debugging.
- **Duration:** `FDateTime`/tick fields are **not reflection-readable** (read `<err>`).
  We use `ReplicatedWorldTimeSeconds`, which is **total session time including champ
  select / draft / intermissions** — not pure in-play. Real in-play would need a
  match-start hook to diff against.
- **MMR / rank is local-player-only.** `WinRatingUpdate` only replicates to *your* client
  for *your* account. Full-lobby MMR requires the **3-reporter merge** (each friend's
  mod reports their own row; the ingest side merges by match). Non-ranked modes have no
  MMR at all — guard for `nil`.
- **Ability-usage counting is parked.** `AbilityPressed` / `TryToActivateAbilityInSlot`
  hooks never fired (won't register / not called through reflection), and it'd be
  local-player-only anyway. Low value, abandoned.
- **Wiki icons 403 curl/node.** `omegastrikers.wiki.gg` blocks hotlinking to `/images/`
  from curl/node; we scraped via a real browser (Playwright same-origin `fetch`).
- **JSON empty containers.** The encoder emits `[]` for empty tables — fine because all
  our empty containers are arrays (sets/players/awakenings); keyed tables (bans/rank)
  always carry string keys so never collide with the array branch.
- **⚠️ Known bug (line ~227):** `local ru = m(gpi, "WinRatingUpdate")` references an
  **undefined `gpi`** — it should be `m(m(ps, "GamePlayerInfo"), "WinRatingUpdate")`.
  As-is, `ru` is always `nil` so every player's `rank` struct is zeroed. Latent because
  rank only populates in Ranked, which hasn't been captured yet. Fix before validating a
  Ranked match.

---

## 9. Server side (where the JSON lands)

- `POST /api/ingest`, header `x-ingest-token` = env `INGEST_TOKEN` **or** any active
  row in `IngestToken` (per-user tokens, managed at `/admin/tokens`).
- Dedup on `Match.gameId` (fallback `matchSignature`). Re-reports of the same match
  merge rather than duplicate (enables the 3-reporter MMR fill).
- Auto-creates a `Player` + `PlayerAccount` per unseen game account. **Auto "stlrc" ≠
  legacy "stlrc"** until identity mapping is seeded (see the dated TODO).
- New rows: `source='auto_capture'`, active `Season`. Legacy manual data:
  `source='legacy_manual'`, "Legacy" season. Guard `RANKS[Math.round(rank)]` — auto rows
  have null legacy rank (use tier/MMR columns).

See also: project `CLAUDE.md` (DB access, auto-capture summary), the dated
`TODO-auto-capture-*.md` (open work), and assistant memory `auto-capture-approach.md`
(design/findings).
