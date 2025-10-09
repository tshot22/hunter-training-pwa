/* Hunter Training v4.5 - WITH BOSS UNDERLINGS & EXPANDED GEAR */
console.log('[Hunter] boot v4.5 - BOSS UNDERLINGS & EXPANDED GEAR');

// Utility functions
const $ = id => document.getElementById(id);
const H = html => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
};
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Constants
const RESTORE_HOUR = 2;
const XP_PER_10_MIN = 15;
const EXTRA_SHOT_COST_AP = 1000;
const STALE_RAID_MS = 10 * 60 * 1000;
const CACHE = 'hunter-v4.5-1';

// Theme initialization
(function() {
    const t = localStorage.getItem('theme') || 'dark';
    if (t === 'light') document.documentElement.classList.add('light');
})();

// Load saved state
const LOAD = () => {
    for (const k of ['htv3full', 'htv3full_fixed', 'htv4']) {
        const v = localStorage.getItem(k);
        if (v) {
            k !== 'htv4' && localStorage.setItem('htv4', v);
            try {
                return JSON.parse(v);
            } catch (e) {
                console.warn('Failed to parse save:', e);
            }
        }
    }
    return null;
};

// Initial state
let state = Object.assign({
    name: 'Hunter',
    class: 'Unassigned',
    level: 1,
    xp: 0,
    xpToNext: 120,
    points: 0,
    stats: { STR: 1, VIT: 1, SPD: 1, DEX: 1, INT: 1, SOC: 0 },
    hp: 15,
    today: { date: today(), steps: 0, mins: 0, water: 0, completedQuests: [] },
    gold: 0,
    ap: 0,
    equips: { weapon: null, boots: null, tome: null, banner: null },
    inventory: [],
    consumables: [],
    meta: { lastRestore: null, lootPity: 0 },
    friends: [],
    invites: [],
    raid: { active: false, dungeon: null, shots: 0, maxShots: 5, bossHP: 0, bossHPMax: 0, damageDealt: 0, startedAt: 0 },
    nonneg: localStorage.getItem('nonneg') ? JSON.parse(localStorage.getItem('nonneg')) : { pushups: 100, squats: 100, walk_km: 5, run_km: 0 },
    nonnegProgress: { pushups: 0, squats: 0, walk_km: 0, run_km: 0 }
}, LOAD() || {});

// Save function
const save = () => localStorage.setItem('htv4', JSON.stringify(state));

// Stat calculations
function classMods() {
    const m = { STR: 0, VIT: 0, SPD: 0, DEX: 0, INT: 0, SOC: 0 };
    switch (state.class) {
        case 'Warrior': m.STR += 2; break;
        case 'Knight': m.VIT += 2; break;
        case 'Mage': m.INT += 2; break;
        case 'Archer': m.DEX += 2; m.SPD += 1; break;
        case 'Assassin': m.DEX += 1; m.INT += 1; break;
        case 'Healer': m.SOC += 2; m.INT += 1; break;
    }
    return m;
}

function equippedMods() {
    const m = { STR: 0, VIT: 0, SPD: 0, DEX: 0, INT: 0, SOC: 0 };
    Object.values(state.equips).forEach(id => {
        const it = state.inventory.find(x => x.id === id);
        if (it?.mods) for (const k in it.mods) m[k] = (m[k] || 0) + it.mods[k];
    });
    return m;
}

function derived() {
    const s = state.stats;
    const em = equippedMods();
    const cm = classMods();
    const STR = s.STR + (em.STR || 0) + (cm.STR || 0);
    const VIT = s.VIT + (em.VIT || 0) + (cm.VIT || 0);
    const SPD = s.SPD + (em.SPD || 0) + (cm.SPD || 0);
    const DEX = s.DEX + (em.DEX || 0) + (cm.DEX || 0);
    const INT = s.INT + (em.INT || 0) + (cm.INT || 0);
    const SOC = s.SOC + (em.SOC || 0) + (cm.SOC || 0);
    const HP = 15 + VIT * 10 + Math.floor(STR * 2);
    const MP = 5 + INT * 5;
    const ATK = Math.floor(STR * 1.6 + DEX * 0.6);
    const DEF = Math.floor(VIT * 1.3 + STR * 0.4);
    return { STR, VIT, SPD, DEX, INT, SOC, HP, MP, ATK, DEF };
}

// UI utilities
function setText(id, v) { const el = $(id); if (el) el.textContent = String(v); }
function setWidth(id, p) { const el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, p)) + '%'; }
function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}

// Build UI
function buildUI() {
    const r = $('appRoot');
    r.innerHTML = `
        <!-- Top Bar -->
        <div class="topbar">
            <div class="brand">🎯 Hunter Training</div>
            <div class="header-stats">
                <span>Lv.<strong id="HP_HDR">1</strong></span>
                <span>❤️<strong id="HP_HDR">15</strong></span>
                <span>💰<strong id="GOLD_HDR">0</strong></span>
                <span>⚡<strong id="AP_HDR">0</strong></span>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" data-tab="status">Status</button>
            <button class="tab" data-tab="log">Log</button>
            <button class="tab" data-tab="quests">Quests</button>
            <button class="tab" data-tab="dungeon">Dungeon</button>
            <button class="tab" data-tab="raid">Raid</button>
            <button class="tab" data-tab="shop">Shop</button>
            <button class="tab" data-tab="inventory">Inventory</button>
            <button class="tab" data-tab="party">Party</button>
            <button class="tab" data-tab="settings">Settings</button>
        </div>

        <!-- Main Content -->
        <main>
            <section id="status" class="panel active">
                <div class="grid">
                    <div class="card">
                        <div class="row">
                            <div class="avatar-wrap" id="avatarContainer">
                                <svg viewBox="0 0 200 260" width="140" height="182" id="avatarSVG">
                                    <defs>
                                        <linearGradient id="skin" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0" stop-color="#f2d2b6"/>
                                            <stop offset="1" stop-color="#ddb08a"/>
                                        </linearGradient>
                                        <linearGradient id="weaponGlow" x1="0" x2="1" y1="0" y2="0">
                                            <stop offset="0" stop-color="#ffd700"/>
                                            <stop offset="1" stop-color="#ff6b6b"/>
                                        </linearGradient>
                                        <linearGradient id="staffGradient" x1="0" x2="1" y1="0" y2="0">
                                            <stop offset="0" stop-color="#ffd700"/>
                                            <stop offset="1" stop-color="#ff8c00"/>
                                        </linearGradient>
                                        <linearGradient id="daggerGradient" x1="0" x2="1" y1="0" y2="0">
                                            <stop offset="0" stop-color="#c0c0c0"/>
                                            <stop offset="1" stop-color="#808080"/>
                                        </linearGradient>
                                    </defs>
                                    <g id="avatarBase">
                                        <ellipse cx="100" cy="130" rx="28" ry="42" fill="url(#skin)" stroke="#855" stroke-width="2"/>
                                    </g>
                                    <g id="equipmentOverlay"></g>
                                </svg>
                                <div class="equipment-status" id="equipmentStatus"></div>
                            </div>
                            <div>
                                <div class="title" id="charName">Hunter</div>
                                <div class="muted" id="charClass">Class: Unassigned</div>
                                <div class="hpbar">
                                    <div class="hpbar-fill" id="hpbar_fill"></div>
                                </div>
                                <div class="muted small"><span id="HP_TXT">15/15</span> HP</div>
                            </div>
                        </div>
                        
                        <!-- Stat Points Allocation -->
                        <div id="statPointsSection" style="display:none; margin:12px 0; padding:12px; background:var(--accent); border-radius:8px;">
                            <div class="title" style="font-size:14px; margin-bottom:8px;">📊 Stat Points: <span id="statPointsCount">0</span></div>
                            <div class="stat-points-grid">
                                ${['STR','VIT','SPD','DEX','INT','SOC'].map(stat => 
                                    `<button class="stat-btn" data-stat="${stat}">+1 ${stat}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="progress" style="margin:8px 0;">
                            <div id="xpBar" class="progress-fill"></div>
                        </div>
                        <div class="muted small">Level <span id="level">1</span> • <span id="xp">0</span>/<span id="xpToNext">120</span> XP</div>
                        
                        <div class="stats">
                            ${['STR','VIT','SPD','DEX','INT','SOC'].map(k => 
                                `<div class="stat"><span>${k}</span><strong id="${k}">0</strong></div>`
                            ).join('')}
                        </div>
                        
                        <div class="list" style="margin-top:8px">
                            <div class="item"><div>Gold</div><strong id="GOLD">0</strong></div>
                            <div class="item"><div>AP</div><strong id="AP">0</strong></div>
                            <div class="item"><div>Points</div><strong id="points">0</strong></div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="title">🎯 Current Equipment</div>
                        <div id="currentEquipment" class="list"></div>
                    </div>
                    
                    <div class="card">
                        <div class="title">📅 Daily Summary</div>
                        <div>Steps today: <strong id="todaySteps">0</strong></div>
                        <div>Workout min: <strong id="todayMins">0</strong></div>
                        <div>Water: <strong id="todayWater">0</strong> / <span id="waterGoal">2000</span> ml</div>
                        <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border);">
                            <div class="muted small">💡 Complete daily tasks for Gold & XP!</div>
                        </div>
                    </div>

                    <!-- Non-Negotiable Logging -->
                    <div class="card">
                        <div class="title">💪 Log Non-negotiables</div>
                        <div class="row" style="flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                            <button class="tiny" data-log="pushups" data-amount="10">+10 Push-ups</button>
                            <button class="tiny" data-log="pushups" data-amount="20">+20 Push-ups</button>
                            <button class="tiny" data-log="squats" data-amount="10">+10 Squats</button>
                            <button class="tiny" data-log="squats" data-amount="20">+20 Squats</button>
                        </div>
                        <div class="row" style="flex-wrap: wrap; gap: 8px;">
                            <button class="tiny" data-log="walk_km" data-amount="1">+1 km Walk</button>
                            <button class="tiny" data-log="run_km" data-amount="1">+1 km Run</button>
                            <button class="tiny" data-log="walk_km" data-amount="2">+2 km Walk</button>
                            <button class="tiny" data-log="run_km" data-amount="2">+2 km Run</button>
                        </div>
                        <div class="muted small" style="margin-top: 8px;">
                            Progress: Push-ups ${state.nonnegProgress?.pushups || 0}/${state.nonneg?.pushups || 0} | 
                            Squats ${state.nonnegProgress?.squats || 0}/${state.nonneg?.squats || 0}
                        </div>
                    </div>
                </div>
            </section>

            <section id="log" class="panel">
                <div class="card">
                    <div class="title">Steps → AP</div>
                    <div class="row">
                        <input id="stepsInput" class="input" type="number" placeholder="Steps">
                        <button id="addStepsBtn" class="btn">Add</button>
                    </div>
                    <div class="title" style="margin-top:12px">Log Workout</div>
                    <div class="row">
                        <select id="workoutType" class="input">
                            <option value="cardio">Cardio</option>
                            <option value="strength">Strength</option>
                            <option value="mobility">Mobility/Yoga</option>
                        </select>
                        <input id="minutesInput" class="input" type="number" placeholder="Minutes">
                        <button id="addWorkoutBtn" class="btn">Log</button>
                    </div>
                    <div class="title" style="margin-top:12px">Hydration</div>
                    <div class="row">
                        <input id="waterInput" class="input" type="number" placeholder="ml">
                        <button id="addWaterBtn" class="btn">Add</button>
                    </div>
                </div>
            </section>

            <section id="quests" class="panel">
                <div class="card">
                    <div class="title">Daily Quests</div>
                    <div id="questList" class="list"></div>
                </div>
            </section>

            <section id="dungeon" class="panel">
                <div class="card">
                    <div class="title">Choose a Dungeon</div>
                    <div class="row" style="gap:8px">
                        <label class="muted small">Tier:</label>
                        <select id="tierSelect" class="input" style="max-width:180px">
                            <option value="1">I (Easy)</option>
                            <option value="2">II (Normal)</option>
                            <option value="3">III (Hard)</option>
                            <option value="4">IV (Nightmare)</option>
                            <option value="5">V (Mythic)</option>
                        </select>
                    </div>
                    <div id="dungeonList" class="list" style="margin-top:8px"></div>
                </div>
            </section>

            <section id="raid" class="panel">
                <div class="card">
                    <div class="title">Raid Arena <span class="badge" id="raidTip">Drag back and release to fire • Hit weak spot for crit</span></div>
                    <div id="raidProgressWrap">
                        <div id="raidProgress"></div>
                    </div>
                    <canvas id="raidCanvas" width="420" height="260"></canvas>
                    <div class="power">
                        <div id="powerFill" class="fill"></div>
                    </div>
                    <div class="row" style="margin-top:8px">
                        <button id="buyShotBtn" class="btn ghost">Buy +1 Shot (1000 AP)</button>
                        <button id="exitRaidBtn" class="btn">Finish Raid</button>
                    </div>
                    <div class="muted small" id="raidHUD"></div>
                </div>
            </section>

            <section id="shop" class="panel">
                <div class="card">
                    <div class="title">Shop <span class="muted">(Gold: <strong id="GOLD_SHOP">0</strong>)</span></div>
                    <div id="shopList" class="list"></div>
                </div>
            </section>

            <section id="inventory" class="panel">
                <div class="card">
                    <div class="title">Inventory</div>
                    <div class="row" style="justify-content:space-between">
                        <div class="muted small">Equip slots: weapon, boots, tome, banner</div>
                        <button id="sellDupesBtn" class="tiny">Sell All Duplicates</button>
                    </div>
                    <div id="invList" class="list"></div>
                    <div class="title" style="margin-top:12px">Consumables</div>
                    <div id="consumableList" class="list"></div>
                </div>
            </section>

            <section id="party" class="panel">
                <div class="card">
                    <div class="title">Friends</div>
                    <div class="row">
                        <input id="friendSearch" class="input" placeholder="username">
                        <button id="addFriendBtn" class="btn">Add</button>
                    </div>
                    <div class="muted small">Auto-raid friends always join your raids (no cost to them).</div>
                    <div id="friendList" class="list" style="margin-top:8px"></div>
                    <div class="title" style="margin-top:12px">Auto-Raid</div>
                    <div id="autoRaidList" class="list"></div>
                </div>
            </section>

            <section id="settings" class="panel">
                <div class="card">
                    <div class="title">Profile & Save</div>
                    <div class="row">
                        <input id="nameInput" class="input" placeholder="Hunter name">
                        <button id="saveName" class="btn">Save</button>
                    </div>
                    <div class="row" style="margin-top:8px">
                        <label class="muted">Class</label>
                        <select id="classSelect" class="input">
                            <option>Unassigned</option>
                            <option>Warrior</option>
                            <option>Knight</option>
                            <option>Mage</option>
                            <option>Archer</option>
                            <option>Assassin</option>
                            <option>Healer</option>
                        </select>
                        <button id="saveClass" class="btn ghost">Save</button>
                    </div>
                    <div class="row" style="margin-top:8px">
                        <label class="muted">Water goal (ml)</label>
                        <input id="waterGoalInput" class="input" type="number" placeholder="2000">
                        <button id="saveWaterGoal" class="btn ghost">Save</button>
                    </div>
                </div>
                <div class="card">
                    <div class="title">Daily Non-negotiables</div>
                    <div class="row">
                        <label class="muted small" style="min-width:120px">Push-ups</label>
                        <input id="nn_pushups" class="input" type="number" min="0" step="10" placeholder="100">
                    </div>
                    <div class="row" style="margin-top:6px">
                        <label class="muted small" style="min-width:120px">Squats</label>
                        <input id="nn_squats" class="input" type="number" min="0" step="10" placeholder="100">
                    </div>
                    <div class="row" style="margin-top:6px">
                        <label class="muted small" style="min-width:120px">Walk (km)</label>
                        <input id="nn_walk" class="input" type="number" min="0" step="1" placeholder="5">
                    </div>
                    <div class="row" style="margin-top:6px">
                        <label class="muted small" style="min-width:120px">Run (km)</label>
                        <input id="nn_run" class="input" type="number" min="0" step="1" placeholder="0">
                    </div>
                    <div class="row" style="margin-top:8px; justify-content:flex-end">
                        <button id="saveNN" class="btn">Save Non-negotiables</button>
                    </div>
                    <div class="muted small">These show under Quests as your must-do dailies and scale with your level later.</div>
                </div>
                <div class="card">
                    <div class="title">Appearance</div>
                    <div class="row">
                        <label class="muted">Theme</label>
                        <select id="themeSelect" class="input">
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                        <button id="saveTheme" class="btn ghost">Save</button>
                    </div>
                    <div class="muted small">Switch between light and dark theme. Stored locally.</div>
                </div>
            </section>
        </main>

        <!-- Results Overlay -->
        <div id="overlay" class="overlay" hidden>
            <div class="overlay-card">
                <div class="title">Raid Results</div>
                <div id="endDetails" class="list"></div>
                <button id="closeOverlay" class="btn" style="margin-top:16px">Continue</button>
            </div>
        </div>

        <!-- Toast -->
        <div id="toast" class="toast"></div>
    `;
}

// Data tables
const SHOP = [
    // Original items
    { id: 'iron_sword', name: 'Iron Sword', price: 120, slot: 'weapon', rar: 'common', mods: { STR: 2, DEX: 1 } },
    { id: 'oak_bow', name: 'Oak Bow', price: 130, slot: 'weapon', rar: 'common', mods: { DEX: 2, SPD: 1 } },
    { id: 'apprentice_staff', name: 'Apprentice Staff', price: 140, slot: 'weapon', rar: 'common', mods: { INT: 2 } },
    { id: 'boots_of_wind', name: 'Boots of Wind', price: 150, slot: 'boots', mods: { SPD: 3 } },
    { id: 'tome_of_focus', name: 'Tome of Focus', price: 180, slot: 'tome', mods: { INT: 3 } },
    { id: 'banner_of_friends', name: 'Banner of Friends', price: 160, slot: 'banner', mods: { SOC: 2 } },
    { id: 'potion_small', name: 'Health Potion (S)', price: 60, type: 'potion', heal: 20 },
    { id: 'potion_large', name: 'Health Potion (L)', price: 140, type: 'potion', heal: 50 },
    
    // NEW: Expanded gear
    { id: 'steel_greatsword', name: 'Steel Greatsword', price: 280, slot: 'weapon', rar: 'uncommon', mods: { STR: 4, VIT: 1 } },
    { id: 'composite_bow', name: 'Composite Bow', price: 260, slot: 'weapon', rar: 'uncommon', mods: { DEX: 4, SPD: 2 } },
    { id: 'arcane_rod', name: 'Arcane Rod', price: 300, slot: 'weapon', rar: 'uncommon', mods: { INT: 4, SPD: 1 } },
    { id: 'assassin_daggers', name: 'Assassin Daggers', price: 270, slot: 'weapon', rar: 'uncommon', mods: { DEX: 3, SPD: 3 } },
    { id: 'plate_boots', name: 'Plate Boots', price: 220, slot: 'boots', rar: 'uncommon', mods: { VIT: 3, STR: 1 } },
    { id: 'tome_of_wisdom', name: 'Tome of Wisdom', price: 320, slot: 'tome', rar: 'uncommon', mods: { INT: 4, SOC: 1 } },
    { id: 'banner_of_courage', name: 'Banner of Courage', price: 240, slot: 'banner', rar: 'uncommon', mods: { SOC: 3, VIT: 2 } },
    { id: 'amulet_of_vitality', name: 'Amulet of Vitality', price: 180, slot: 'tome', rar: 'common', mods: { VIT: 2 } }
];

const LOOT = [
    // Original loot table
    { baseId: 'iron_sword', weight: 20 }, { baseId: 'oak_bow', weight: 20 }, { baseId: 'apprentice_staff', weight: 20 },
    { baseId: 'boots_of_wind', weight: 14 }, { baseId: 'tome_of_focus', weight: 10 }, { baseId: 'banner_of_friends', weight: 8 },
    { baseId: 'potion_small', weight: 40 }, { baseId: 'potion_large', weight: 18 },
    // NEW: Expanded loot
    { baseId: 'steel_greatsword', weight: 8 }, { baseId: 'composite_bow', weight: 8 }, { baseId: 'arcane_rod', weight: 8 },
    { baseId: 'assassin_daggers', weight: 8 }, { baseId: 'plate_boots', weight: 6 }, { baseId: 'tome_of_wisdom', weight: 5 },
    { baseId: 'banner_of_courage', weight: 5 }, { baseId: 'amulet_of_vitality', weight: 12 }
];

const BASE_DUNGEONS = [
    { id: 'goblin_cave', name: 'Goblin Cave', baseAP: 3000, base: { hp: 120, def: 16 }, reward: { xp: 80, gold: 50 } },
    { id: 'orc_camp', name: 'Orc Camp', baseAP: 6000, base: { hp: 260, def: 22 }, reward: { xp: 160, gold: 110 } },
    { id: 'wyvern_roost', name: 'Wyvern Roost', baseAP: 9000, base: { hp: 380, def: 26 }, reward: { xp: 260, gold: 170 } },
    { id: 'dragon_lair', name: 'Dragon Lair', baseAP: 12000, base: { hp: 520, def: 30 }, reward: { xp: 400, gold: 260 } }
];

// BOSS UNDERLINGS SYSTEM
const UNDERLINGS = {
    goblin_cave: [
        { name: 'Goblin Scout', hp: 40, def: 8, reward: { xp: 20, gold: 15 } },
        { name: 'Goblin Brute', hp: 60, def: 12, reward: { xp: 30, gold: 20 } }
    ],
    orc_camp: [
        { name: 'Orc Grunt', hp: 80, def: 14, reward: { xp: 40, gold: 25 } },
        { name: 'Orc Shaman', hp: 60, def: 10, reward: { xp: 35, gold: 30 } }
    ],
    wyvern_roost: [
        { name: 'Wyvern Hatchling', hp: 100, def: 16, reward: { xp: 60, gold: 40 } },
        { name: 'Aerial Scout', hp: 80, def: 14, reward: { xp: 50, gold: 35 } }
    ],
    dragon_lair: [
        { name: 'Dragonkin Warrior', hp: 140, def: 20, reward: { xp: 80, gold: 60 } },
        { name: 'Scalebound Mage', hp: 120, def: 18, reward: { xp: 70, gold: 50 } }
    ]
};

function tierScale(t) {
    const mult = [0, 1, 1.6, 2.3, 3.2, 4.5][t] || 1;
    const reward = [0, 1, 1.4, 1.9, 2.6, 3.6][t] || 1;
    return { hp: mult, def: 1 + 0.12 * (t - 1), ap: 1 + 0.5 * (t - 1), rew: reward };
}

function buildDungeonList() {
    const tier = +($('tierSelect')?.value || 1);
    const s = tierScale(tier);
    return BASE_DUNGEONS.map(d => ({
        id: `${d.id}_t${tier}`,
        name: `${d.name} — Tier ${tier}`,
        entryAP: Math.round(d.baseAP * s.ap),
        boss: { hp: Math.round(d.base.hp * s.hp), def: Math.round(d.base.def * s.def) },
        reward: { xp: Math.round(d.reward.xp * s.rew), gold: Math.round(d.reward.gold * s.rew) }
    }));
}

// NEW: Stat Allocation System
function increaseStat(stat) {
    if (state.points > 0 && state.stats[stat] < 99) {
        state.stats[stat]++;
        state.points--;
        
        // Recalculate HP if VIT increased
        if (stat === 'VIT') {
            const dv = derived();
            state.hp = Math.min(state.hp, dv.HP);
        }
        
        save();
        render();
        toast(`${stat} increased to ${state.stats[stat]}!`);
    }
}

// NEW: Avatar with Equipment Display
function updateAvatar() {
    const overlay = document.getElementById('equipmentOverlay');
    const statusEl = document.getElementById('equipmentStatus');
    if (!overlay || !statusEl) return;
    
    overlay.innerHTML = '';
    
    // Get class-based weapon appearance
    const classWeapon = getClassWeaponSVG();
    if (classWeapon) {
        overlay.innerHTML += classWeapon;
    }
    
    // Add equipped weapon on top of class weapon (if different)
    const weapon = state.equips.weapon ? state.inventory.find(x => x.id === state.equips.weapon) : null;
    if (weapon) {
        const weaponSVG = getWeaponSVG(weapon);
        overlay.innerHTML += weaponSVG;
    }
    
    // Update equipment status
    const slots = ['weapon', 'boots', 'tome', 'banner'];
    const equippedItems = slots.map(slot => {
        const item = state.equips[slot] ? state.inventory.find(x => x.id === state.equips[slot]) : null;
        return item ? `${slot}: ${item.name}` : `${slot}: Empty`;
    });
    
    statusEl.textContent = equippedItems.join(' • ');
}

function getClassWeaponType() {
    switch(state.class) {
        case 'Warrior': return 'sword';
        case 'Knight': return 'sword';
        case 'Mage': return 'staff';
        case 'Archer': return 'bow';
        case 'Assassin': return 'dagger';
        case 'Healer': return 'staff';
        default: return 'sword';
    }
}

function getClassWeaponSVG() {
    switch(state.class) {
        case 'Warrior':
            return `<rect x="85" y="80" width="30" height="8" fill="url(#weaponGlow)" transform="rotate(45 100 84)"/>`;
        case 'Knight':
            return `<rect x="90" y="75" width="20" height="10" fill="url(#weaponGlow)" transform="rotate(40 100 80)"/>`;
        case 'Mage':
            return `<rect x="98" y="60" width="4" height="40" fill="url(#staffGradient)"/><circle cx="100" cy="55" r="6" fill="url(#staffGradient)"/>`;
        case 'Archer':
            return `<path d="M85,90 Q100,70 115,90" stroke="url(#weaponGlow)" stroke-width="3" fill="none"/><line x1="100" y1="90" x2="100" y2="100" stroke="url(#weaponGlow)" stroke-width="2"/>`;
        case 'Assassin':
            return `<rect x="95" y="80" width="10" height="4" fill="url(#daggerGradient)" transform="rotate(45 100 82)"/><rect x="93" y="85" width="8" height="3" fill="url(#daggerGradient)" transform="rotate(-45 97 86.5)"/>`;
        case 'Healer':
            return `<rect x="98" y="65" width="4" height="30" fill="url(#staffGradient)"/><path d="M100,55 L95,65 L105,65 Z" fill="url(#staffGradient)"/>`;
        default:
            return `<rect x="95" y="80" width="10" height="6" fill="url(#weaponGlow)"/>`;
    }
}

function getWeaponSVG(weapon) {
    const weaponType = weapon.name.toLowerCase();
    if (weaponType.includes('sword')) {
        return `<rect x="85" y="80" width="30" height="8" fill="url(#weaponGlow)" transform="rotate(45 100 84)"/>`;
    } else if (weaponType.includes('bow')) {
        return `<path d="M85,90 Q100,70 115,90" stroke="url(#weaponGlow)" stroke-width="3" fill="none"/>`;
    } else if (weaponType.includes('staff') || weaponType.includes('rod')) {
        return `<rect x="98" y="60" width="4" height="40" fill="url(#staffGradient)"/>`;
    } else if (weaponType.includes('dagger')) {
        return `<rect x="95" y="80" width="10" height="4" fill="url(#daggerGradient)" transform="rotate(45 100 82)"/>`;
    } else {
        return `<rect x="95" y="80" width="10" height="6" fill="url(#weaponGlow)"/>`;
    }
}

// NEW: Current Equipment Display
function renderCurrentEquipment() {
    const container = document.getElementById('currentEquipment');
    if (!container) return;
    
    container.innerHTML = '';
    const slots = [
        { key: 'weapon', label: '⚔️ Weapon' },
        { key: 'boots', label: '👢 Boots' },
        { key: 'tome', label: '📖 Tome' },
        { key: 'banner', label: '🚩 Banner' }
    ];
    
    slots.forEach(slot => {
        const item = state.equips[slot.key] ? state.inventory.find(x => x.id === state.equips[slot.key]) : null;
        const el = H(`<div class="item">
            <div>${slot.label}</div>
            <div class="muted small">${item ? item.name : 'Empty'}</div>
        </div>`);
        container.append(el);
    });
}

// NEW: Non-Negotiable Quest Logging
function logNonNegotiable(type, amount) {
    if (!state.nonnegProgress) {
        state.nonnegProgress = { pushups: 0, squats: 0, walk_km: 0, run_km: 0 };
    }
    
    if (state.nonnegProgress[type] !== undefined) {
        state.nonnegProgress[type] += amount;
        
        // Check for completion
        const goal = state.nonneg[type] || 0;
        if (state.nonnegProgress[type] >= goal && goal > 0) {
            const questId = `nn_${type}`;
            if (!state.today.completedQuests?.includes(questId)) {
                setTimeout(() => {
                    claimQuestReward(questId);
                }, 500);
            }
        }
        
        save();
        render();
        toast(`Logged ${amount} ${type.replace('_', ' ')}!`);
    }
}

// UPDATED: Quests with Gold & XP Rewards
function renderQuests() {
    const list = $('questList');
    if (!list) return;
    list.innerHTML = '';
    
    const base = Math.max(6000, 6000 + state.level * 200);
    const mins = 20 + Math.floor(state.level / 2) * 5;
    const water = Number(localStorage.getItem('waterGoal') || 2000);
    
    const quests = [
        { id: 'steps', name: `Walk ${base} steps`, goal: base, progress: state.today.steps, xp: 40, gold: 20 },
        { id: 'workout', name: `Train ${mins} min`, goal: mins, progress: state.today.mins, xp: 40, gold: 20 },
        { id: 'hydration', name: `Drink ${water} ml`, goal: water, progress: state.today.water, xp: 20, gold: 10 }
    ];
    
    quests.forEach(q => {
        const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
        const isCompleted = state.today.completedQuests?.includes(q.id) || false;
        const canClaim = !isCompleted && q.progress >= q.goal;
        
        const el = H(`<div class="item ${isCompleted ? 'completed' : ''}">
            <div style="flex:1">
                <div>${q.name} ${isCompleted ? '✅' : ''}</div>
                <div class="progress" style="margin-top:6px">
                    <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="muted small">${q.progress}/${q.goal} • ${q.xp} XP • ${q.gold} gold</div>
            </div>
            <button class="tiny ${isCompleted ? 'ghost' : ''}" data-claim="${q.id}" ${!canClaim ? 'disabled' : ''}>
                ${isCompleted ? 'Claimed' : 'Claim Reward'}
            </button>
        </div>`);
        list.append(el);
    });
    
    // Enhanced non-negotiable quests with progress tracking
    const nn = state.nonneg || {};
    const nnProgress = state.nonnegProgress || {};
    const nnItems = [
        { k: 'pushups', label: `Push-ups ${nn.pushups || 0}`, goal: nn.pushups || 0, progress: nnProgress.pushups || 0 },
        { k: 'squats', label: `Squats ${nn.squats || 0}`, goal: nn.squats || 0, progress: nnProgress.squats || 0 },
        { k: 'walk_km', label: `Walk ${nn.walk_km || 0} km`, goal: (nn.walk_km || 0) * 1000, progress: (nnProgress.walk_km || 0) * 1000, alt: true },
        { k: 'run_km', label: `Run ${nn.run_km || 0} km`, goal: (nn.run_km || 0) * 1000, progress: (nnProgress.run_km || 0) * 1000, alt: true }
    ].filter(x => x.goal > 0);
    
    nnItems.forEach(q => {
        const progress = q.alt ? (nnProgress[q.k] || 0) * 1000 : q.progress;
        const pct = q.goal ? Math.min(100, Math.round((progress / q.goal) * 100)) : 0;
        const isCompleted = state.today.completedQuests?.includes(`nn_${q.k}`) || false;
        const canClaim = !isCompleted && progress >= q.goal;
        
        const el = H(`<div class="item ${isCompleted ? 'completed' : ''}">
            <div style="flex:1">
                <div>🏁 ${q.label} (Non-negotiable) ${isCompleted ? '✅' : ''}</div>
                <div class="progress" style="margin-top:6px">
                    <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="muted small">${Math.round(progress)}/${q.goal || 0}</div>
            </div>
            <button class="tiny ${isCompleted ? 'ghost' : ''}" data-claim="nn_${q.k}" ${!canClaim ? 'disabled' : ''}>
                ${isCompleted ? 'Claimed' : 'Claim Reward'}
            </button>
        </div>`);
        list.append(el);
    });
    
    // Add event listeners for claim buttons
    list.querySelectorAll('[data-claim]').forEach(btn => {
        btn.onclick = () => {
            const questId = btn.getAttribute('data-claim');
            claimQuestReward(questId);
        };
    });
}

// NEW: Claim Quest Rewards
function claimQuestReward(questId) {
    let xpReward = 0;
    let goldReward = 0;
    
    // Determine rewards based on quest type
    if (questId === 'steps') {
        xpReward = 40;
        goldReward = 20;
    } else if (questId === 'workout') {
        xpReward = 40;
        goldReward = 20;
    } else if (questId === 'hydration') {
        xpReward = 20;
        goldReward = 10;
    } else if (questId.startsWith('nn_')) {
        // Non-negotiable quests give better rewards
        xpReward = 60;
        goldReward = 30;
    }
    
    // Add rewards
    gainXP(xpReward);
    state.gold += goldReward;
    
    // Mark quest as completed
    if (!state.today.completedQuests) {
        state.today.completedQuests = [];
    }
    state.today.completedQuests.push(questId);
    
    save();
    render();
    
    toast(`🎉 Quest completed! +${xpReward} XP, +${goldReward} Gold`);
}

// UPDATED: Activity logging with auto-rewards
function logActivity(type, value) {
    const oldSteps = state.today.steps;
    const oldMins = state.today.mins;
    const oldWater = state.today.water;
    
    if (type === 'steps') {
        state.today.steps += value;
        state.ap += value; // Still get AP for steps
        
        // Auto-complete steps quest if goal reached
        const stepsGoal = Math.max(6000, 6000 + state.level * 200);
        if (oldSteps < stepsGoal && state.today.steps >= stepsGoal && !state.today.completedQuests?.includes('steps')) {
            setTimeout(() => {
                claimQuestReward('steps');
            }, 500);
        }
        
    } else if (type === 'workout') {
        state.today.mins += value;
        const chunks = Math.floor(value / 10);
        if (chunks > 0) gainXP(chunks * XP_PER_10_MIN);
        
        // Auto-complete workout quest if goal reached
        const minsGoal = 20 + Math.floor(state.level / 2) * 5;
        if (oldMins < minsGoal && state.today.mins >= minsGoal && !state.today.completedQuests?.includes('workout')) {
            setTimeout(() => {
                claimQuestReward('workout');
            }, 500);
        }
        
    } else if (type === 'water') {
        state.today.water += value;
        
        // Auto-complete hydration quest if goal reached
        const waterGoal = Number(localStorage.getItem('waterGoal') || 2000);
        if (oldWater < waterGoal && state.today.water >= waterGoal && !state.today.completedQuests?.includes('hydration')) {
            setTimeout(() => {
                claimQuestReward('hydration');
            }, 500);
        }
    }
    
    save();
    render();
}

// UPDATED: Gain XP with Health Potion Reward
function gainXP(n) {
    const oldLevel = state.level;
    state.xp += n;
    
    while (state.xp >= state.xpToNext) {
        state.xp -= state.xpToNext;
        state.level += 1;
        state.points += 3;
        state.xpToNext = Math.round(state.xpToNext * 1.2 + 35);
        
        // Give health potion on level up
        state.consumables.push({
            id: 'con_' + Date.now(),
            type: 'potion',
            name: 'Level Up Health Potion',
            heal: 30
        });
        
        toast(`🎉 Level ${state.level}! +3 Stat Points + Health Potion!`);
    }
    
    save();
    render();
}

// Render function
function setRaidProgress(p) {
    const el = $('raidProgress');
    if (el) el.style.width = Math.max(0, Math.min(100, p)) + '%';
}

function render() {
    const d = derived();
    
    // Update all UI elements
    setText('GOLD_HDR', state.gold);
    setText('AP_HDR', state.ap);
    setText('HP_HDR', state.hp);
    setText('charName', state.name || 'Hunter');
    setText('charClass', `Class: ${state.class}`);
    setWidth('xpBar', Math.round((state.xp / state.xpToNext) * 100));
    setText('level', state.level);
    setText('xp', state.xp);
    setText('xpToNext', state.xpToNext);
    setText('HP_TXT', `${state.hp}/${d.HP}`);
    const hpPct = Math.round((state.hp / d.HP) * 100);
    const hpBar = document.getElementById('hpbar_fill');
    if (hpBar) hpBar.style.width = hpPct + '%';
    
    ['STR', 'VIT', 'SPD', 'DEX', 'INT', 'SOC'].forEach(k => setText(k, d[k]));
    setText('GOLD', state.gold);
    setText('AP', state.ap);
    setText('points', state.points);
    setText('todaySteps', state.today.steps);
    setText('todayMins', state.today.mins);
    setText('todayWater', state.today.water);
    setText('GOLD_SHOP', state.gold);
    
    const cls = $('classSelect');
    if (cls) cls.value = state.class;
    
    const th = $('themeSelect');
    if (th) th.value = (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    
    // NEW: Stat Points UI
    const statPointsSection = document.getElementById('statPointsSection');
    const statPointsCount = document.getElementById('statPointsCount');
    if (statPointsSection && statPointsCount) {
        if (state.points > 0) {
            statPointsSection.style.display = 'block';
            statPointsCount.textContent = state.points;
        } else {
            statPointsSection.style.display = 'none';
        }
    }
    
    // NEW: Update avatar and equipment displays
    updateAvatar();
    renderCurrentEquipment();
    
    // Update non-negotiable progress display
    const nnProgressEl = document.querySelector('.card:last-child .muted.small');
    if (nnProgressEl) {
        nnProgressEl.textContent = `Progress: Push-ups ${state.nonnegProgress?.pushups || 0}/${state.nonneg?.pushups || 0} | Squats ${state.nonnegProgress?.squats || 0}/${state.nonneg?.squats || 0}`;
    }
    
    renderQuests();
    renderDungeons();
    renderShop();
    renderInventory();
    renderConsumables();
    renderFriends();
}

// Shop / Inventory
function renderShop() {
    const L = $('shopList');
    if (!L) return;
    L.innerHTML = '';
    SHOP.forEach(it => {
        const mods = it.mods ? Object.entries(it.mods).map(([k, v]) => `${k}+${v}`).join(', ') : '';
        const tag = it.rar ? `<span class="muted small rarity-${it.rar}">[${it.rar}]</span>` : '';
        const right = it.type === 'potion' ? `${it.price} gold • heals ${it.heal}` : `${it.price} gold`;
        const el = H(`<div class="item"><div><div>${it.name} ${tag}</div><div class="muted small">${mods}</div></div><div class="row"><div class="muted small">${right}</div><button class="tiny" data-buy="${it.id}">Buy</button></div></div>`);
        L.append(el);
    });
    L.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
        const id = b.getAttribute('data-buy');
        const it = SHOP.find(x => x.id === id);
        if (state.gold < it.price) return toast('Not enough gold');
        state.gold -= it.price;
        if (it.type === 'potion') {
            state.consumables.push({ id: 'con_' + Date.now(), type: 'potion', name: it.name, heal: it.heal });
        } else {
            state.inventory.push({ id: 'itm_' + Date.now(), name: it.name, mods: it.mods, baseId: it.id, slot: it.slot });
        }
        save();
        render();
        toast('Purchased');
    });
}

function sellPrice(baseId) {
    const s = SHOP.find(x => x.id === baseId);
    if (s) return Math.floor(s.price * 0.5);
    return 60;
}

function renderInventory() {
    const L = $('invList');
    if (!L) return;
    L.innerHTML = '';
    if (!state.inventory.length) {
        L.append(H(`<div class="muted small">No gear</div>`));
        return;
    }
    state.inventory.forEach(it => {
        const on = Object.values(state.equips).includes(it.id);
        const mods = it.mods ? Object.entries(it.mods).map(([k, v]) => `${k}+${v}`).join(', ') : '';
        const el = H(`<div class="item"><div><div>${it.name} <span class="muted small">[${it.slot || '—'}]</span></div><div class="muted small">${mods}</div></div>
            <div class="row"><button class="tiny" data-sell="${it.id}">Sell (${sellPrice(it.baseId)}g)</button><button class="tiny" data-equip="${it.id}">${on ? 'Unequip' : 'Equip'}</button></div></div>`);
        L.append(el);
    });
    L.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => {
        const id = b.getAttribute('data-equip');
        const it = state.inventory.find(x => x.id === id);
        if (!it) return;
        const slot = it.slot || 'weapon';
        if (state.equips[slot] === id) {
            state.equips[slot] = null;
        } else {
            state.equips[slot] = id;
        }
        save();
        render();
    });
    L.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
        const id = b.getAttribute('data-sell');
        const idx = state.inventory.findIndex(x => x.id === id);
        if (idx < 0) return;
        Object.keys(state.equips).forEach(sl => {
            if (state.equips[sl] === id) state.equips[sl] = null;
        });
        const gain = sellPrice(state.inventory[idx].baseId);
        state.gold += gain;
        state.inventory.splice(idx, 1);
        save();
        render();
        toast(`Sold (+${gain}g)`);
    });
    const btn = $('sellDupesBtn');
    if (btn) btn.onclick = () => {
        const seen = {}, toSell = [];
        for (const it of state.inventory) {
            if (!it.baseId) continue;
            if (!seen[it.baseId]) seen[it.baseId] = it.id;
            else toSell.push(it.id);
        }
        if (!toSell.length) {
            toast('No duplicates');
            return;
        }
        let gain = 0;
        for (const id of toSell) {
            const idx = state.inventory.findIndex(x => x.id === id);
            if (idx < 0) continue;
            Object.keys(state.equips).forEach(sl => {
                if (state.equips[sl] === id) state.equips[sl] = null;
            });
            gain += sellPrice(state.inventory[idx].baseId);
            state.inventory.splice(idx, 1);
        }
        state.gold += gain;
        save();
        render();
        toast(`Sold ${toSell.length} dupes (+${gain}g)`);
    };
}

function renderConsumables() {
    const L = $('consumableList');
    if (!L) return;
    L.innerHTML = '';
    if (!state.consumables.length) {
        L.append(H(`<div class="muted small">No consumables</div>`));
        return;
    }
    state.consumables.forEach(c => {
        const el = H(`<div class="item"><div>${c.name} <span class="muted small">(+${c.heal || 0} HP)</span></div><button class="tiny" data-use="${c.id}">Use</button></div>`);
        L.append(el);
    });
    L.querySelectorAll('[data-use]').forEach(b => b.onclick = () => {
        const idx = state.consumables.findIndex(x => x.id === b.getAttribute('data-use'));
        if (idx < 0) return;
        const dv = derived();
        state.hp = Math.min(dv.HP, state.hp + (state.consumables[idx].heal || 0));
        state.consumables.splice(idx, 1);
        save();
        render();
        toast('+HP');
    });
}

// Friends
function renderFriends() {
    const list = $('friendList');
    if (!list) return;
    list.innerHTML = '';
    if (!state.friends.length) list.append(H(`<div class="muted small">No friends yet</div>`));
    state.friends.forEach(f => {
        const el = H(`<div class="item"><div>${f.name} <span class="muted small">(${f.id})</span></div><label class="muted small"><input type="checkbox" data-auto="${f.id}" ${f.autoRaid ? 'checked' : ''}> Auto-raid</label></div>`);
        list.append(el);
    });
    list.querySelectorAll('[data-auto]').forEach(cb => cb.onchange = () => {
        const f = state.friends.find(x => x.id === cb.getAttribute('data-auto'));
        f.autoRaid = cb.checked;
        save();
        renderFriends();
    });
    const auto = $('autoRaidList');
    auto.innerHTML = '';
    state.friends.filter(f => f.autoRaid).forEach(f => auto.append(H(`<div class="item"><div>${f.name}</div><div class="muted small">Auto</div></div>`)));
}

// Raid System with Underlings
let C, CTX, mouse, proj, raf;
const gravity = 0.38;
let DUNGEONS = [];
let shotStart = 0;
let obstacles = [], weakRect = null;

function renderDungeons() {
    const L = $('dungeonList');
    if (!L) return;
    DUNGEONS = buildDungeonList();
    L.innerHTML = '';
    DUNGEONS.forEach(d => {
        const el = H(`<div class="item dungeon-with-underlings"><div><div>${d.name}</div><div class="muted small">Entry: ${d.entryAP} AP • Rewards: ${d.reward.xp} XP, ${d.reward.gold} gold</div></div><button class="tiny" data-enter="${d.id}">Enter</button></div>`);
        L.append(el);
    });
    L.querySelectorAll('[data-enter]').forEach(b => b.onclick = () => enterRaid(b.getAttribute('data-enter')));
    $('tierSelect').onchange = () => renderDungeons();
}

function projectile() {
    switch (state.class) {
        case 'Warrior': return { mass: 1.5, dmg: 18, shape: 'sword', crit: .06 };
        case 'Knight': return { mass: 1.7, dmg: 14, shape: 'shield' };
        case 'Mage': return { mass: 1.0, dmg: 16, shape: 'orb', splash: 6, crit: .1 };
        case 'Archer': return { mass: 0.9, dmg: 15, shape: 'arrow', crit: .12 };
        case 'Assassin': return { mass: 0.9, dmg: 15, shape: 'dagger', crit: .18 };
        case 'Healer': return { mass: 0.8, dmg: 10, shape: 'spark' };
        default: return { mass: 1.0, dmg: 12, shape: 'ball' };
    }
}

// ENHANCED: Enter Raid with Underlings
function enterRaid(id) {
    const d = DUNGEONS.find(x => x.id === id);
    if (state.ap < d.entryAP) return toast('Not enough AP');
    
    state.ap -= d.entryAP;
    
    // Get underlings for this dungeon
    const baseDungeonId = id.split('_t')[0]; // Remove tier suffix
    const underlings = UNDERLINGS[baseDungeonId] || [];
    
    state.raid = {
        active: true,
        dungeon: id,
        shots: 0,
        maxShots: 5,
        bossHP: d.boss.hp,
        bossHPMax: d.boss.hp,
        damageDealt: 0,
        startedAt: Date.now(),
        // Underling system
        underlings: underlings.map(u => ({
            ...u,
            currentHP: u.hp
        })),
        currentUnderling: 0,
        underlingsDefeated: 0,
        bossEmpowered: false
    };
    
    save();
    render();
    
    // Switch to raid view
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    document.querySelector('.tab[data-tab="raid"]').classList.add('active');
    $('raid').classList.add('active');
    
    setupCanvas();
    renderHUD();
    setRaidProgress(0);
}

// ENHANCED: HUD with Underling Info
function renderHUD() {
    const hud = $('raidHUD');
    if (!hud) return;
    
    const raid = state.raid;
    let hudText = `Shots: ${raid.shots}/${raid.maxShots} • Boss HP: ${raid.bossHP}/${raid.bossHPMax}`;
    
    // Add underling info if applicable
    if (raid.underlings.length > 0 && raid.currentUnderling < raid.underlings.length) {
        const currentUnderling = raid.underlings[raid.currentUnderling];
        hudText = `Underling: ${currentUnderling.name} (${currentUnderling.currentHP}/${currentUnderling.hp}) • ${hudText}`;
    } else if (raid.underlingsDefeated > 0) {
        hudText = `Underlings defeated: ${raid.underlingsDefeated}/${raid.underlings.length} • ${hudText}`;
        if (raid.bossEmpowered) {
            hudText += ' • BOSS EMPOWERED!';
        }
    }
    
    hud.textContent = hudText;
}

function setupCanvas() {
    C = $('raidCanvas');
    if (!C) {
        console.error('Canvas element not found!');
        return;
    }
    
    CTX = C.getContext('2d');
    if (!CTX) {
        console.error('Canvas context not supported!');
        return;
    }
    
    mouse = { down: false, sx: 60, sy: C.height - 30, x: 60, y: C.height - 30 };
    obstacles = [{ x: 200, y: 150, w: 20, h: 60 }, { x: 260, y: 100, w: 16, h: 40 }];
    weakRect = { x: C.width - 80, y: 70, w: 16, h: 16 };
    
    // Mouse events
    C.onmousedown = e => {
        const rr = C.getBoundingClientRect();
        mouse.down = true;
        mouse.x = e.clientX - rr.left;
        mouse.y = e.clientY - rr.top;
        draw();
    };
    
    C.onmousemove = e => {
        const rr = C.getBoundingClientRect();
        mouse.x = e.clientX - rr.left;
        mouse.y = e.clientY - rr.top;
        if (mouse.down) draw();
    };
    
    C.onmouseup = () => {
        if (mouse.down) {
            mouse.down = false;
            launch();
        }
    };
    
    // Touch events for mobile
    C.ontouchstart = e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rr = C.getBoundingClientRect();
        mouse.down = true;
        mouse.x = touch.clientX - rr.left;
        mouse.y = touch.clientY - rr.top;
        draw();
    };
    
    C.ontouchmove = e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rr = C.getBoundingClientRect();
        mouse.x = touch.clientX - rr.left;
        mouse.y = touch.clientY - rr.top;
        if (mouse.down) draw();
    };
    
    C.ontouchend = () => {
        if (mouse.down) {
            mouse.down = false;
            launch();
        }
    };
    
    draw();
}

function launch() {
    if (state.raid.shots >= state.raid.maxShots) {
        toast('No shots left');
        return;
    }
    
    const dx = mouse.sx - mouse.x, dy = mouse.sy - mouse.y;
    const power = Math.min(80, Math.hypot(dx, dy));
    
    if (power < 6) {
        toast('Pull further back');
        return;
    }
    
    const angle = Math.atan2(dy, dx);
    const base = projectile();
    const dv = derived();
    
    const speed = (-power / 2.1);
    proj = {
        x: mouse.sx,
        y: mouse.sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 7,
        atk: dv.ATK + (base.dmg || 10),
        mass: base.mass || 1,
        shape: base.shape || 'ball',
        props: base
    };
    
    state.raid.shots++;
    shotStart = performance.now();
    setRaidProgress(5);
    animate();
    renderHUD();
}

function animate() {
    cancelAnimationFrame(raf);
    
    const step = (t) => {
        updatePhysics();
        
        if (shotStart) {
            const elapsed = Math.min(2000, t - shotStart);
            setRaidProgress(5 + (elapsed / 2000) * 90);
        }
        
        draw();
        
        // Continue animation if projectile still exists
        if (proj) {
            raf = requestAnimationFrame(step);
        }
    };
    
    raf = requestAnimationFrame(step);
}

function updatePhysics() {
    if (!proj) return;

    // Apply gravity and movement
    proj.vy += 0.38 * proj.mass;
    proj.x += proj.vx;
    proj.y += proj.vy;

    // Floor collision
    if (proj.y > C.height - 12) {
        proj.y = C.height - 12;
        proj.vy *= -0.35;
        proj.vx *= 0.75;
        
        // Stop if too slow
        if (Math.abs(proj.vx) < 0.4 && Math.abs(proj.vy) < 2) {
            onShotEnd(0);
            proj = null;
        }
    }

    // Wall collisions
    if (proj.x < 0 || proj.x > C.width) {
        proj = null;
        onShotEnd(0);
        return;
    }

    // Obstacle collisions
    for (const o of obstacles) {
        if (proj.x > o.x && proj.x < o.x + o.w && proj.y > o.y && proj.y < o.y + o.h) {
            proj.vx *= -0.5;
            proj.vy *= -0.3;
        }
    }

    // Boss collision detection
    const bossX = C.width - 90, bossY = 60, bossW = 60, bossH = 120;
    if (proj.x > bossX && proj.y > bossY && proj.x < bossX + bossW && proj.y < bossY + bossH) {
        const dv = derived();
        const base = projectile();
        const impact = Math.min(100, Math.hypot(proj.vx, proj.vy) * 2 + proj.atk);
        let mult = 1;
        let crit = false;
        const critChance = (base.props?.crit || 0) + (dv.DEX * 0.002) + (dv.INT * 0.001);

        // Weak spot check
        if (proj.x > weakRect.x && proj.x < weakRect.x + weakRect.w &&
            proj.y > weakRect.y && proj.y < weakRect.y + weakRect.h) {
            mult += 0.5;
            crit = true;
        }
        
        // Critical chance
        if (Math.random() < critChance) {
            mult += 0.5;
            crit = true;
        }

        const damageInfo = {
            impact: Math.round(impact),
            mult: Math.round(mult * 10) / 10,
            crit,
            x: Math.round(proj.x),
            y: Math.round(proj.y)
        };
        
        proj = null;
        onShotEnd(damageInfo);
    }
}

function draw() {
    if (!CTX) return;
    
    // Clear canvas
    CTX.fillStyle = document.documentElement.classList.contains('light') ? '#eef3ff' : '#0e1117';
    CTX.fillRect(0, 0, C.width, C.height);
    
    // Draw obstacles
    CTX.fillStyle = document.documentElement.classList.contains('light') ? '#c8d7ff' : '#233042';
    obstacles.forEach(o => CTX.fillRect(o.x, o.y, o.w, o.h));
    
    // Draw boss
    const bx = C.width - 90, by = 60, bw = 60, bh = 120;
    CTX.fillStyle = document.documentElement.classList.contains('light') ? '#b95a6e' : '#40222a';
    CTX.fillRect(bx, by, bw, bh);
    
    // Draw weak spot
    CTX.fillStyle = document.documentElement.classList.contains('light') ? '#ff7b8b' : '#d66';
    CTX.fillRect(weakRect.x, weakRect.y, weakRect.w, weakRect.h);
    
    // Draw boss health bar
    const pct = Math.max(0, state.raid.bossHP / state.raid.bossHPMax);
    CTX.fillStyle = document.documentElement.classList.contains('light') ? '#ffd0d6' : '#311';
    CTX.fillRect(C.width - 95, 40, 70, 10);
    CTX.fillStyle = '#ff5a6b';
    CTX.fillRect(C.width - 95, 40, 70 * pct, 10);
    
    // Draw aiming line when mouse is down
    if (mouse?.down) {
        CTX.strokeStyle = document.documentElement.classList.contains('light') ? '#4e6cff' : '#6ba8ff';
        CTX.beginPath();
        CTX.moveTo(mouse.sx, mouse.sy);
        CTX.lineTo(mouse.x, mouse.y);
        CTX.stroke();
        
        const dx = mouse.sx - mouse.x, dy = mouse.sy - mouse.y;
        let p = Math.min(80, Math.hypot(dx, dy));
        const a = Math.atan2(dy, dx);
        let vx = Math.cos(a) * (-p / 2.1), vy = Math.sin(a) * (-p / 2.1);
        let tx = mouse.sx, ty = mouse.sy;
        
        CTX.fillStyle = document.documentElement.classList.contains('light') ? '#4e6cff' : '#9ad';
        for (let i = 0; i < 20; i++) {
            vy += 0.38;
            tx += vx;
            ty += vy;
            CTX.fillRect(tx, ty, 2, 2);
        }
        
        $('powerFill').style.width = Math.round((p / 80) * 100) + '%';
    } else {
        $('powerFill').style.width = '0%';
    }
    
    // Draw projectile if it exists
    if (proj) {
        CTX.fillStyle = '#aef';
        if (proj.shape === 'arrow') {
            CTX.fillRect(proj.x - 6, proj.y - 1, 12, 2);
        } else if (proj.shape === 'sword') {
            CTX.fillRect(proj.x - 2, proj.y - 8, 4, 16);
        } else if (proj.shape === 'orb') {
            CTX.beginPath();
            CTX.arc(proj.x, proj.y, 7, 0, Math.PI * 2);
            CTX.fill();
        } else if (proj.shape === 'dagger') {
            CTX.fillRect(proj.x - 2, proj.y - 6, 4, 12);
        } else if (proj.shape === 'shield') {
            CTX.beginPath();
            CTX.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
            CTX.fill();
        } else {
            CTX.beginPath();
            CTX.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
            CTX.fill();
        }
    }
}

function rng(n) { return Math.floor(Math.random() * n); }

function pickLoot() {
    const total = LOOT.reduce((a, l) => a + l.weight, 0);
    let r = Math.random() * total;
    for (const l of LOOT) {
        if ((r -= l.weight) <= 0) return l;
    }
    return LOOT[0];
}

function toItem(baseId) {
    const b = SHOP.find(x => x.id === baseId);
    if (!b) return null;
    if (b.type === 'potion') return { id: 'con_' + Date.now(), type: 'potion', name: b.name, heal: b.heal };
    return { id: 'itm_' + Date.now(), name: b.name, mods: b.mods, baseId: b.id, slot: b.slot };
}

// ENHANCED: Shot end handler with underlings
function onShotEnd(info) {
    const raid = state.raid;
    const d = buildDungeonList().find(x => x.id === raid.dungeon);
    const dv = derived();
    const base = projectile();
    
    const stat = dv.ATK + dv.DEX * 0.4 + dv.INT * 0.2;
    const impact = info?.impact || 0;
    const mult = info?.mult || 1;
    const dmg = Math.max(0, Math.round(impact * (stat / 20) * mult - d.boss.def + (base.splash ? base.splash / 2 : 0)));
    
    // Check if we're fighting underlings or boss
    if (raid.currentUnderling < raid.underlings.length) {
        // Fighting underlings
        const underling = raid.underlings[raid.currentUnderling];
        underling.currentHP = Math.max(0, underling.currentHP - dmg);
        raid.damageDealt += dmg;
        
        if (underling.currentHP <= 0) {
            // Underling defeated!
            raid.underlingsDefeated++;
            raid.currentUnderling++;
            
            // Give underling rewards immediately
            state.gold += underling.reward.gold;
            gainXP(underling.reward.xp);
            
            toast(`Underling defeated! +${underling.reward.xp} XP, +${underling.reward.gold} Gold`);
            
            if (raid.currentUnderling >= raid.underlings.length) {
                // All underlings defeated - boss time!
                toast('All underlings defeated! Prepare for the boss!');
            }
        }
    } else {
        // Fighting boss
        raid.bossHP = Math.max(0, raid.bossHP - dmg);
        raid.damageDealt += dmg;
        
        if (raid.bossHP <= 0) {
            setTimeout(() => finishRaid(true), 500);
        }
    }
    
    setRaidProgress(100);
    setTimeout(() => setRaidProgress(0), 450);
    save();
    renderHUD();
    
    // Show damage feedback
    if (info && info.impact > 0) {
        const feedback = info.crit ? `CRIT! ${dmg} damage` : `${dmg} damage`;
        toast(feedback);
    }
}

function showEndScreen(res) {
    const ov = $('overlay');
    const d = $('endDetails');
    const lootTxt = res.loot?.length ? res.loot.map(x => x.name).join(', ') : '—';
    
    d.innerHTML = '';
    
    const details = [
        ['Outcome', res.success ? '✅ Victory' : '❌ Defeat'],
        ['Underlings', `${res.underlingsDefeated || 0}/${res.totalUnderlings || 0} defeated`],
        ['XP Gained', res.xp],
        ['Gold Gained', res.gold],
        ['Damage Dealt', res.dmg],
        ['Shots Used', res.shots],
        ['Party Size', res.partySize],
        ['Loot', lootTxt]
    ];
    
    details.forEach(([k, v]) => {
        d.append(H(`<div class="item"><div>${k}</div><strong>${v}</strong></div>`));
    });
    
    ov.hidden = false;
    $('closeOverlay').onclick = () => {
        ov.hidden = true;
    };
}

// ENHANCED: Finish raid with underling consequences
function finishRaid(ok) {
    const raid = state.raid;
    const d = buildDungeonList().find(x => x.id === raid.dungeon);
    let xp = 0, gold = 0, loot = [];
    
    if (ok) {
        // Base rewards
        gold = d.reward.gold;
        xp = d.reward.xp;
        
        // Bonus for defeating all underlings
        const allUnderlingsDefeated = raid.underlingsDefeated === raid.underlings.length;
        if (allUnderlingsDefeated) {
            gold = Math.round(gold * 1.2); // 20% bonus
            xp = Math.round(xp * 1.2);
            toast('Flawless Victory! +20% bonus!');
        } else if (raid.underlingsDefeated > 0) {
            // Partial completion - reduced rewards
            const completionRatio = raid.underlingsDefeated / raid.underlings.length;
            gold = Math.round(gold * (0.5 + completionRatio * 0.5));
            xp = Math.round(xp * (0.5 + completionRatio * 0.5));
        }
        
        state.gold += gold;
        gainXP(xp);
        
        // Loot rolls
        let rolls = (Math.random() < 0.2) ? 2 : (Math.random() < 0.6 ? 1 : 0);
        // Extra roll for defeating all underlings
        if (allUnderlingsDefeated && Math.random() < 0.3) rolls++;
        
        for (let i = 0; i < rolls; i++) {
            const pick = pickLoot();
            const item = toItem(pick.baseId);
            if (item) (item.type === 'potion' ? state.consumables : state.inventory).push(item);
            loot.push(item);
        }
    }
    
    // HP loss based on performance
    let hpLoss = ok ? 4 : 8;
    if (ok && raid.underlingsDefeated < raid.underlings.length) {
        hpLoss += 2; // Extra HP loss for not clearing all underlings
    }
    state.hp = Math.max(0, state.hp - hpLoss);
    
    const summary = {
        success: ok,
        xp,
        gold,
        dmg: raid.damageDealt,
        shots: raid.shots,
        partySize: state.friends.filter(f => f.autoRaid).length,
        loot,
        underlingsDefeated: raid.underlingsDefeated,
        totalUnderlings: raid.underlings.length
    };
    
    // Reset raid state
    state.raid = {
        active: false,
        dungeon: null,
        shots: 0,
        maxShots: 5,
        bossHP: 0,
        bossHPMax: 0,
        damageDealt: 0,
        startedAt: 0,
        underlings: [],
        currentUnderling: 0,
        underlingsDefeated: 0,
        bossEmpowered: false
    };
    
    save();
    render();
    
    // Return to dungeon view
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    document.querySelector('.tab[data-tab="dungeon"]').classList.add('active');
    $('dungeon').classList.add('active');
    showEndScreen(summary);
}

// Input handlers
function hookInputs() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        $(b.dataset.tab).classList.add('active');
    });
    
    // NEW: Stat allocation buttons
    document.querySelectorAll('.stat-btn').forEach(btn => {
        btn.onclick = () => {
            const stat = btn.getAttribute('data-stat');
            increaseStat(stat);
        };
    });
    
    // NEW: Non-negotiable logging buttons
    document.querySelectorAll('[data-log]').forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-log');
            const amount = parseInt(btn.getAttribute('data-amount'));
            logNonNegotiable(type, amount);
        };
    });
    
    $('addStepsBtn').onclick = () => {
        const n = +($('stepsInput').value || 0);
        if (n > 0) {
            logActivity('steps', n);
            toast('Steps logged! +' + n + ' AP');
        }
    };
    
    $('addWorkoutBtn').onclick = () => {
        const m = +($('minutesInput').value || 0);
        if (m > 0) {
            logActivity('workout', m);
            toast('Workout logged!');
        }
    };
    
    $('addWaterBtn').onclick = () => {
        const w = +($('waterInput').value || 0);
        if (w > 0) {
            logActivity('water', w);
            toast('Hydration logged!');
        }
    };
    
    $('addFriendBtn').onclick = () => {
        const name = ($('friendSearch').value || '').trim();
        if (!name) return;
        const id = 'u_' + name.toLowerCase().replace(/\W+/g, '');
        if (state.friends.some(f => f.id === id)) return toast('Already friends');
        state.friends.push({ id, name, autoRaid: false });
        save();
        render();
        toast('Friend added');
    };
    
    $('saveName').onclick = () => {
        state.name = $('nameInput').value || 'Hunter';
        save();
        render();
        toast('Name saved');
    };
    
    $('saveClass').onclick = () => {
        state.class = $('classSelect').value || 'Unassigned';
        save();
        render();
        toast('Class saved');
    };
    
    $('saveWaterGoal').onclick = () => {
        const v = +($('waterGoalInput').value || 2000);
        localStorage.setItem('waterGoal', v);
        render();
        toast('Goal saved');
    };
    
    $('buyShotBtn').onclick = () => {
        if (!state.raid.active) return;
        if (state.ap < EXTRA_SHOT_COST_AP) return toast('Not enough AP');
        state.ap -= EXTRA_SHOT_COST_AP;
        state.raid.maxShots += 1;
        save();
        renderHUD();
        render();
        toast('+1 shot');
    };
    
    $('exitRaidBtn').onclick = () => {
        if (!state.raid.active) return;
        finishRaid(state.raid.bossHP <= 0);
    };
    
    $('saveTheme').onclick = () => {
        const t = $('themeSelect').value;
        localStorage.setItem('theme', t);
        document.documentElement.classList.toggle('light', t === 'light');
        render();
        toast('Theme updated');
    };
    
    // Non-negotiables settings
    const nn = state.nonneg || {};
    const pf = (id, val) => { const el = $(id); if (el) el.value = val ?? ''; };
    pf('nn_pushups', nn.pushups);
    pf('nn_squats', nn.squats);
    pf('nn_walk', nn.walk_km);
    pf('nn_run', nn.run_km);
    
    $('saveNN').onclick = () => {
        state.nonneg = {
            pushups: +($('nn_pushups').value || 0),
            squats: +($('nn_squats').value || 0),
            walk_km: +($('nn_walk').value || 0),
            run_km: +($('nn_run').value || 0)
        };
        localStorage.setItem('nonneg', JSON.stringify(state.nonneg));
        save();
        render();
        toast('Non-negotiables saved');
    };
}

// Daily restore & guards
function maybeRestore() {
    const k = today();
    if (state.meta.lastRestore === k) return;
    
    if (new Date().getHours() >= RESTORE_HOUR) {
        state.hp = derived().HP;
        state.meta.lastRestore = k;
        
        // Reset daily quests AND non-negotiable progress
        state.today = {
            date: k,
            steps: 0,
            mins: 0,
            water: 0,
            completedQuests: []
        };
        
        // Reset non-negotiable progress
        state.nonnegProgress = { pushups: 0, squats: 0, walk_km: 0, run_km: 0 };
        
        save();
        render();
        toast('Daily reset! HP restored, new quests available!');
    }
}

function staleRaidGuard() {
    if (state.raid?.active) {
        const age = Date.now() - (state.raid.startedAt || 0);
        if (isNaN(age) || age > STALE_RAID_MS) {
            state.raid = { active: false, dungeon: null, shots: 0, maxShots: 5, bossHP: 0, bossHPMax: 0, damageDealt: 0, startedAt: 0 };
            save();
        }
    }
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    try {
        navigator.serviceWorker.register('./sw.js');
    } catch (e) {
        console.log('SW registration failed:', e);
    }
}

// Boot sequence
try {
    console.log('[Hunter] Starting game...');
    buildUI();
    hookInputs();
    staleRaidGuard();
    maybeRestore();
    render();
    setInterval(() => maybeRestore(), 60000);
    console.log('[Hunter] Game started successfully!');
} catch (error) {
    console.error('[Hunter] Boot failed:', error);
    const appRoot = document.getElementById('appRoot');
    if (appRoot) {
        appRoot.innerHTML = `
            <div style="padding: 40px; text-align: center; color: red;">
                <h2>Error Loading Game</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #ff5a6b; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload Game</button>
            </div>
        `;
    }
}
