-- OSCapture v3: capture a finished match, build a JSON payload, write it to a
-- file, and POST it to the tracker's /api/ingest via Windows curl.exe.
--
-- Source of truth = APMGameStateBase.MatchEventLog (replicated, all modes incl customs),
-- enriched from live PlayerStates (username, striker name, role, rank/MMR).
-- Trigger: auto on MatchCompleted_Multicast, or manually with F9.

-- ===== CONFIG (change ENDPOINT to the VPS URL for production) ================
-- Defaults; overridden by Mods/OSCapture/config.txt (KEY=VALUE) so each friend
-- can set their own endpoint/token without editing this script.
local ENDPOINT  = "http://localhost:3010/api/ingest"
local TOKEN     = "devtoken123"
local JSON_FILE = "OSCapture_payload.json"   -- written to the game's Win64 cwd
local DUMP_FILE = "OSCapture_dump.txt"       -- human-readable, for debugging
local HOOK_MATCH = "/Script/Prometheus.PMGameStateBase:MatchCompleted_Multicast"
-- Wwise event(s) played on capture; one is chosen at random each time.
local SOUND_EVENTS = { "sfx_cha_generic_evade", "sfx_cha_luna_skin02_bigRocket_cast" }

local HAS_OS_EXEC = (type(os) == "table" and type(os.execute) == "function")

-- Load ENDPOINT/TOKEN overrides from a plain KEY=VALUE config file (cwd is Win64).
local function loadConfig()
    for _, path in ipairs({ "Mods/OSCapture/config.txt", "OSCapture_config.txt" }) do
        local f = io.open(path, "r")
        if f then
            for line in f:lines() do
                if not line:match("^%s*#") then
                    local k, v = line:match("^%s*([%w_]+)%s*=%s*(.-)%s*$")
                    if k == "ENDPOINT" and v and v ~= "" then ENDPOINT = v end
                    if k == "TOKEN" and v and v ~= "" then TOKEN = v end
                end
            end
            f:close()
            return path
        end
    end
    return nil
end
local CONFIG_SRC = loadConfig()

-- ===== helpers ==============================================================
local function s(v)
    if v == nil then return "nil" end
    local ok, r = pcall(function()
        if type(v) == "userdata" and v.ToString then return v:ToString() end
        return tostring(v)
    end)
    return ok and r or "<err>"
end
-- clean string or nil (treats nil/None/empty/err as nil)
local function nameOrNil(v)
    local x = s(v)
    if x == "nil" or x == "None" or x == "" or x == "<err>" then return nil end
    return x
end
local function num(v)
    local ok, r = pcall(function() return tonumber(v) end)
    return (ok and r) or 0
end
local function m(obj, name)
    if obj == nil then return nil end
    local ok, v = pcall(function() return obj[name] end)
    if ok then return v end
    return nil
end
local function unwrap(p)
    if p == nil then return nil end
    if type(p) == "userdata" then
        local ok, v = pcall(function() return p:get() end)
        if ok and v ~= nil then return v end
    end
    return p
end
local function eachArray(arr, fn)
    if arr == nil then return 0 end
    local n = 0
    pcall(function() n = #arr end)
    for i = 1, n do
        local el = nil
        pcall(function() el = arr[i] end)
        if el == nil then pcall(function() el = arr:get(i) end) end
        if el ~= nil then fn(el, i) end
    end
    return n
end

-- ===== minimal JSON encoder =================================================
-- Empty tables encode as [] (all our empty containers are arrays: sets, players,
-- awakenings). Objects (bans, rank) always carry string keys so are never empty.
local function jsonEncode(v)
    local t = type(v)
    if v == nil then return "null" end
    if t == "boolean" then return v and "true" or "false" end
    if t == "number" then return tostring(v) end
    if t == "string" then
        return '"' .. v:gsub('[%z\1-\31\\"]', function(c)
            local mp = { ['"'] = '\\"', ['\\'] = '\\\\', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }
            return mp[c] or string.format('\\u%04x', string.byte(c))
        end) .. '"'
    end
    if t == "table" then
        local n = 0
        for _ in pairs(v) do n = n + 1 end
        if n == 0 then return "[]" end
        if #v == n then
            local parts = {}
            for i = 1, #v do parts[i] = jsonEncode(v[i]) end
            return "[" .. table.concat(parts, ",") .. "]"
        end
        local parts = {}
        for k, val in pairs(v) do parts[#parts + 1] = jsonEncode(tostring(k)) .. ":" .. jsonEncode(val) end
        return "{" .. table.concat(parts, ",") .. "}"
    end
    return "null"
end

-- account id of the local player (the one running this mod) -> reporter id
local function localAccountId()
    local pcs = FindAllOf("PlayerController_Game_C")
    if not pcs or #pcs == 0 then pcs = FindAllOf("PMPlayerControllerGame") end
    if not pcs then return nil end
    for _, pc in ipairs(pcs) do
        if pc and pc:IsValid() then
            local isLocal = false
            pcall(function() isLocal = pc:IsLocalController() end)
            if isLocal then return nameOrNil(m(m(pc, "PlayerState"), "PMPlayerId")) end
        end
    end
    return nil
end

-- ===== build the match record ===============================================
local function buildRecord(mel, gs)
    local rec = { schema_version = 1, players = {}, sets = {}, bans = {}, selections = {} }

    -- TrainingId (TD_ fname) -> InGameName, for awakening name resolution
    local awakeName = {}
    pcall(function()
        local trs = FindAllOf("PMTrainingData")
        if trs then for _, td in ipairs(trs) do if td and td:IsValid() then
            local id = nil
            pcall(function() id = td:GetFName():ToString() end)
            if id then awakeName[id] = nameOrNil(m(td, "InGameName")) end
        end end end
    end)

    if gs and gs:IsValid() then
        rec.game_id = nameOrNil(m(gs, "GameId"))
        rec.map     = nameOrNil(m(m(gs, "CurrentMapData"), "Name"))
        rec.terrain = nameOrNil(m(m(gs, "CurrentTerrainData"), "Name"))
        rec.mode    = nameOrNil(m(m(gs, "CurrentFormatData"), "Name"))
        -- total match duration: elapsed since this match's server world started
        local d = m(gs, "ReplicatedWorldTimeSeconds")
        if not d then pcall(function() d = gs:GetServerWorldTimeSeconds() end) end
        rec.duration = math.floor(num(d) + 0.5)
        local bans  = m(gs, "BannedCharactersData")
        rec.bans.team1 = nameOrNil(m(m(bans, "TeamOneBannedCharacter"), "InGameName"))
        rec.bans.team2 = nameOrNil(m(m(bans, "TeamTwoBannedCharacter"), "InGameName"))
    end

    rec.winning_team = num(m(mel, "WinningTeam"))
    local fs = m(mel, "FinalScore")
    rec.mvp_account_id = nameOrNil(m(fs, "MatchMVP"))
    eachArray(m(fs, "Sets"), function(si, i)
        rec.sets[#rec.sets + 1] = {
            set = i, winning_team = num(m(si, "WinningTeam")),
            team1_goals = num(m(si, "TeamOneGoals")), team2_goals = num(m(si, "TeamTwoGoals")),
        }
    end)

    -- players keyed by account id
    local P, order = {}, {}
    local function pget(id)
        id = tostring(id)
        if not P[id] then
            P[id] = { account_id = id, goals = 0, assists = 0, saves = 0, knockouts = 0,
                      damage = 0, redirects = 0, shots = 0, orbs = 0, own_goals = 0, level = 0, awakenings = {} }
            order[#order + 1] = id
        end
        return P[id]
    end

    eachArray(m(mel, "CharactersSelected"), function(e, i)
        local acct = s(m(e, "SelectingPlayerId"))
        local p = pget(acct)
        -- NOTE: keeps "last write wins" per player (backward compat). Each set re-drafts,
        -- so p.striker_code/p.team end up holding the FINAL set's pick. Per-set order lives
        -- in rec.selections below instead of on the player.
        p.striker_code = nameOrNil(m(e, "CharacterId"))
        p.team = num(m(e, "SelectingTeamNumber"))
        -- Additive: one row per selection event, preserving set (Round) + array order.
        -- pick_index is the raw position in CharactersSelected; interpret per-set after
        -- grouping by `set`. Verify against a real multi-set capture before trusting.
        rec.selections[#rec.selections + 1] = {
            set = num(m(e, "Round")),
            pick_index = i,
            account_id = nameOrNil(m(e, "SelectingPlayerId")),
            team = num(m(e, "SelectingTeamNumber")),
            striker_code = nameOrNil(m(e, "CharacterId")),
        }
    end)
    eachArray(m(mel, "GoalsScored"), function(e)
        local c = m(e, "bHasCreditedPlayer")
        if c == true or c == 1 then pget(s(m(e, "CreditedPlayerId"))).goals = pget(s(m(e, "CreditedPlayerId"))).goals + 1 end
        eachArray(m(e, "AssistingPlayerIds"), function(a) local p = pget(s(a)); p.assists = p.assists + 1 end)
    end)
    eachArray(m(mel, "GoalsSaved"), function(e) local p = pget(s(m(e, "DefendingPlayerId"))); p.saves = p.saves + 1 end)
    eachArray(m(mel, "CharactersKnockedOut"), function(e) local p = pget(s(m(e, "InstigatingPlayerId"))); p.knockouts = p.knockouts + 1 end)
    eachArray(m(mel, "PlayerMatchEvents"), function(e)
        local p = pget(s(m(e, "PlayerId")))
        local sum = m(e, "PlayerMatchEvents")
        p.damage = num(m(sum, "DamageDoneToPlayers"))
        p.redirects = num(m(sum, "RedirectRock"))
        p.shots = num(m(sum, "HitRockIntoGoalArea"))
        p.orbs = num(m(sum, "PowerUpsPickedUpCount"))
    end)
    eachArray(m(mel, "TrainingsSelected"), function(e)
        local p = pget(s(m(e, "SelectingPlayerId")))
        local round = num(m(e, "Round"))
        local function add(code)
            code = nameOrNil(code)
            if code then p.awakenings[#p.awakenings + 1] = { round = round, code = code, name = awakeName[code], order = #p.awakenings } end
        end
        local got = false
        eachArray(m(e, "SelectedTrainings"), function(st) add(s(m(st, "TrainingId"))); got = true end)
        if not got then eachArray(m(e, "TrainingIds"), function(t) add(s(t)) end) end
    end)

    -- enrich from live PlayerStates (username, striker name, role, rank/MMR)
    local states = FindAllOf("PlayerState_Game_C")
    if not states or #states == 0 then states = FindAllOf("PMPlayerState") end
    if states then for _, ps in ipairs(states) do if ps and ps:IsValid() then
        local p = pget(s(m(ps, "PMPlayerId")))
        p.username = nameOrNil(m(ps, "PMDisplayName"))
        p.striker  = nameOrNil(m(m(ps, "ChosenCharacterData"), "InGameName"))
        -- authoritative goalie flag via APMPlayerState::IsGoalie()
        local isGoalie = false
        pcall(function() isGoalie = ps:IsGoalie() end)
        p.role = isGoalie and "goalie" or "forward"
        local gpi = m(ps, "GamePlayerInfo")
        p.role_raw = num(m(gpi, "AssignedRole")) -- kept for debug
        local ru = m(gpi, "WinRatingUpdate")
        p.rank = {
            rating_change = num(m(ru, "RatingChangeAmount")),
            updated_rating = num(m(ru, "UpdatedRating")),
            previous_tier = nameOrNil(m(ru, "PreviousTierId")),
            updated_tier = nameOrNil(m(ru, "UpdatedTierId")),
        }
    end end end

    rec.reporter_account_id = localAccountId()
    for _, id in ipairs(order) do rec.players[#rec.players + 1] = P[id] end
    return rec
end

-- ===== readable dump (for debugging) ========================================
local function formatReadable(rec)
    local L = {}
    local function w(x) L[#L + 1] = x end
    w("======== OSCapture ========\n\n")
    w(string.format("game_id=%s map=%s mode=%s winner=%s mvp=%s\n",
        tostring(rec.game_id), tostring(rec.map), tostring(rec.mode), tostring(rec.winning_team), tostring(rec.mvp_account_id)))
    w(string.format("bans: team1=%s team2=%s\n", tostring(rec.bans.team1), tostring(rec.bans.team2)))
    for _, st in ipairs(rec.sets) do
        w(string.format("  set %d: winner team%d  %d-%d\n", st.set, st.winning_team, st.team1_goals, st.team2_goals))
    end
    if rec.selections and #rec.selections > 0 then
        w(string.format("draft selections (%d, in CharactersSelected order):\n", #rec.selections))
        for _, sel in ipairs(rec.selections) do
            w(string.format("  set=%s pick_index=%s team=%s striker=%s acct=%s\n",
                tostring(sel.set), tostring(sel.pick_index), tostring(sel.team),
                tostring(sel.striker_code), tostring(sel.account_id)))
        end
    end
    for _, p in ipairs(rec.players) do
        w(string.format("[%s] %s  team=%s striker=%s (%s) role=%s(raw %s)\n",
            tostring(p.account_id), tostring(p.username), tostring(p.team), tostring(p.striker), tostring(p.striker_code), tostring(p.role), tostring(p.role_raw)))
        w(string.format("   g=%d a=%d sv=%d ko=%d dmg=%d redir=%d shots=%d orbs=%d rating=%s->%s\n",
            p.goals, p.assists, p.saves, p.knockouts, p.damage, p.redirects, p.shots, p.orbs,
            tostring(p.rank and p.rank.previous_tier), tostring(p.rank and p.rank.updated_tier)))
        for _, a in ipairs(p.awakenings) do
            w(string.format("   awakening r%s: %s (%s)\n", tostring(a.round), tostring(a.name), tostring(a.code)))
        end
    end
    return table.concat(L)
end

-- play the capture-confirmation chime via Wwise (UAkGameplayStatics.PostEventByName)
local function playSound()
    pcall(function()
        local statics = StaticFindObject("/Script/AkAudio.Default__AkGameplayStatics")
        local actor = FindFirstOf("PlayerController")
            or FindFirstOf("PMPlayerControllerGame")
            or FindFirstOf("PMGameState")
        if statics and #SOUND_EVENTS > 0 then
            local name = SOUND_EVENTS[math.random(1, #SOUND_EVENTS)]
            statics:PostEventByName(name, actor, false)
        end
    end)
end

-- ===== upload via Windows curl.exe ==========================================
local function upload()
    if not HAS_OS_EXEC then
        print("[OSCapture] os.execute unavailable -> wrote JSON only (needs companion uploader)\n")
        return
    end
    -- relative @file resolves against the game cwd (Win64), avoiding path-with-spaces issues.
    local cmd = string.format(
        'curl.exe -s -m 12 -X POST -H "content-type: application/json" -H "x-ingest-token: %s" --data-binary "@%s" "%s"',
        TOKEN, JSON_FILE, ENDPOINT)
    -- detach so the game thread never blocks (even if the server is down/slow).
    os.execute('cmd /c start "" /b ' .. cmd)
    print("[OSCapture] POST fired to " .. ENDPOINT .. "\n")
end

-- ===== entry point ==========================================================
local function capture(reason, melOverride)
    local gs = FindFirstOf("PMGameState")
    local mel = melOverride
    if mel == nil and gs and gs:IsValid() then mel = m(gs, "MatchEventLog") end
    if mel == nil then
        print("[OSCapture] no MatchEventLog (" .. reason .. ")\n")
        return
    end

    local rec
    local ok, err = pcall(function() rec = buildRecord(mel, gs) end)
    if not ok or not rec then
        print("[OSCapture] buildRecord failed: " .. tostring(err) .. "\n")
        return
    end

    -- write JSON payload
    local json = jsonEncode(rec)
    local jf = io.open(JSON_FILE, "w")
    if jf then jf:write(json); jf:close() end
    -- write readable dump
    local df = io.open(DUMP_FILE, "w")
    if df then df:write(formatReadable(rec)); df:close() end

    print(string.format("[OSCapture] captured (%s): %d players, game_id=%s\n", reason, #rec.players, tostring(rec.game_id)))
    upload()
    playSound()
end

-- auto trigger at match end (reads the completed log from the multicast param)
local ok, err = pcall(function()
    RegisterHook(HOOK_MATCH, function(self, completedLog)
        capture("MatchCompleted_Multicast", unwrap(completedLog))
    end)
end)
print(string.format("[OSCapture v3] loaded. hook=%s os.execute=%s config=%s endpoint=%s. Manual = F9.\n",
    tostring(ok), tostring(HAS_OS_EXEC), tostring(CONFIG_SRC or "defaults"), ENDPOINT))

RegisterKeyBind(Key.F9, function() capture("manual F9") end)

-- F7: play a RANDOM loaded sound each press so you can browse for one you like.
-- The played event name is printed clearly in the UE4SS console -- note the ones
-- you want, then tell me and I'll set SOUND_EVENT to it.
pcall(function() math.randomseed(os.time()) end)
RegisterKeyBind(Key.F7, function()
    local evs = FindAllOf("AkAudioEvent")
    if not evs or #evs == 0 then print("[OSCapture] no sounds loaded (try in a match)\n"); return end
    -- collect one-shot candidates (skip loops / stops / silence-ish)
    local names = {}
    for _, ev in ipairs(evs) do
        if ev and ev:IsValid() then
            local nm = ""
            pcall(function() nm = ev:GetFName():ToString() end)
            if nm ~= "" and not nm:find("loop") and not nm:find("stop") and not nm:find("_amb_") then
                names[#names + 1] = nm
            end
        end
    end
    if #names == 0 then return end
    local nm = names[math.random(1, #names)]
    local statics = StaticFindObject("/Script/AkAudio.Default__AkGameplayStatics")
    local actor = FindFirstOf("PlayerController")
        or FindFirstOf("PMPlayerControllerGame") or FindFirstOf("PMGameState")
    if statics then pcall(function() statics:PostEventByName(nm, actor, false) end) end
    print(string.format("\n>>>>> SOUND: %s <<<<<\n", nm))
end)
