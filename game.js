/* Hunter Training v4.5 - WITH BOSS UNDERLINGS & EXPANDED GEAR */
console.log('[Hunter] boot v4.5 - BOSS UNDERLINGS & EXPANDED GEAR');

// Add after the existing state initialization
let state = Object.assign({
  // ... existing state properties ...
  nonneg: localStorage.getItem('nonneg') ? JSON.parse(localStorage.getItem('nonneg')) : {pushups:100,squats:100,walk_km:5,run_km:0},
  // NEW: Track non-negotiable progress
  nonnegProgress: {pushups:0, squats:0, walk_km:0, run_km:0}
}, LOAD() || {});

// --- EXPANDED GEAR TABLES ---
const SHOP = [
  // Original items
  {id:'iron_sword',name:'Iron Sword',price:120,slot:'weapon',rar:'common',mods:{STR:2,DEX:1}},
  {id:'oak_bow',name:'Oak Bow',price:130,slot:'weapon',rar:'common',mods:{DEX:2,SPD:1}},
  {id:'apprentice_staff',name:'Apprentice Staff',price:140,slot:'weapon',rar:'common',mods:{INT:2}},
  {id:'boots_of_wind',name:'Boots of Wind',price:150,slot:'boots',mods:{SPD:3}},
  {id:'tome_of_focus',name:'Tome of Focus',price:180,slot:'tome',mods:{INT:3}},
  {id:'banner_of_friends',name:'Banner of Friends',price:160,slot:'banner',mods:{SOC:2}},
  {id:'potion_small',name:'Health Potion (S)',price:60,type:'potion',heal:20},
  {id:'potion_large',name:'Health Potion (L)',price:140,type:'potion',heal:50},
  
  // NEW: Expanded gear
  {id:'steel_greatsword',name:'Steel Greatsword',price:280,slot:'weapon',rar:'uncommon',mods:{STR:4,VIT:1}},
  {id:'composite_bow',name:'Composite Bow',price:260,slot:'weapon',rar:'uncommon',mods:{DEX:4,SPD:2}},
  {id:'arcane_rod',name:'Arcane Rod',price:300,slot:'weapon',rar:'uncommon',mods:{INT:4,SPD:1}},
  {id:'assassin_daggers',name:'Assassin Daggers',price:270,slot:'weapon',rar:'uncommon',mods:{DEX:3,SPD:3}},
  {id:'plate_boots',name:'Plate Boots',price:220,slot:'boots',rar:'uncommon',mods:{VIT:3,STR:1}},
  {id:'tome_of_wisdom',name:'Tome of Wisdom',price:320,slot:'tome',rar:'uncommon',mods:{INT:4,SOC:1}},
  {id:'banner_of_courage',name:'Banner of Courage',price:240,slot:'banner',rar:'uncommon',mods:{SOC:3,VIT:2}},
  {id:'amulet_of_vitality',name:'Amulet of Vitality',price:180,slot:'tome',rar:'common',mods:{VIT:2,HP:10}} // NEW: HP bonus
];

const LOOT = [
  // Original loot table
  {baseId:'iron_sword', weight:20},{baseId:'oak_bow', weight:20},{baseId:'apprentice_staff', weight:20},
  {baseId:'boots_of_wind', weight:14},{baseId:'tome_of_focus', weight:10},{baseId:'banner_of_friends', weight:8},
  {baseId:'potion_small', weight:40},{baseId:'potion_large', weight:18},
  // NEW: Expanded loot
  {baseId:'steel_greatsword', weight:8},{baseId:'composite_bow', weight:8},{baseId:'arcane_rod', weight:8},
  {baseId:'assassin_daggers', weight:8},{baseId:'plate_boots', weight:6},{baseId:'tome_of_wisdom', weight:5},
  {baseId:'banner_of_courage', weight:5},{baseId:'amulet_of_vitality', weight:12}
];

// --- BOSS UNDERLINGS SYSTEM ---
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

// Add to state for tracking underling progress
let state = Object.assign({
  // ... existing state ...
  raid: {
    active: false,
    dungeon: null,
    shots: 0,
    maxShots: 5,
    bossHP: 0,
    bossHPMax: 0,
    damageDealt: 0,
    startedAt: 0,
    // NEW: Underling tracking
    underlings: [],
    currentUnderling: 0,
    underlingsDefeated: 0,
    bossEmpowered: false
  }
}, LOAD() || {});

// --- ENHANCED AVATAR SYSTEM WITH CLASS ITEMS ---
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
  if (weapon && !weapon.name.toLowerCase().includes(getClassWeaponType())) {
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
      return `<rect x="98" y="60" width="4" height="40" fill="url(#weaponGlow)"/><circle cx="100" cy="55" r="6" fill="url(#weaponGlow)"/>`;
    case 'Archer':
      return `<path d="M85,90 Q100,70 115,90" stroke="url(#weaponGlow)" stroke-width="3" fill="none"/><line x1="100" y1="90" x2="100" y2="100" stroke="url(#weaponGlow)" stroke-width="2"/>`;
    case 'Assassin':
      return `<rect x="95" y="80" width="10" height="4" fill="url(#weaponGlow)" transform="rotate(45 100 82)"/><rect x="93" y="85" width="8" height="3" fill="url(#weaponGlow)" transform="rotate(-45 97 86.5)"/>`;
    case 'Healer':
      return `<rect x="98" y="65" width="4" height="30" fill="url(#weaponGlow)"/><path d="M100,55 L95,65 L105,65 Z" fill="url(#weaponGlow)"/>`;
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
    return `<rect x="98" y="60" width="4" height="40" fill="url(#weaponGlow)"/>`;
  } else if (weaponType.includes('dagger')) {
    return `<rect x="95" y="80" width="10" height="4" fill="url(#weaponGlow)" transform="rotate(45 100 82)"/>`;
  } else {
    return `<rect x="95" y="80" width="10" height="6" fill="url(#weaponGlow)"/>`;
  }
}

// --- NON-NEGOTIABLE QUEST LOGGING ---
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

// Add to UI build for non-negotiables logging
function addNonNegotiableLogging() {
  const statusPanel = document.getElementById('status');
  if (!statusPanel) return;
  
  // Add logging interface after the daily summary card
  const loggingCard = H(`
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
  `);
  
  statusPanel.querySelector('.card:last-child').after(loggingCard);
  
  // Add event listeners
  loggingCard.querySelectorAll('[data-log]').forEach(btn => {
    btn.onclick = () => {
      const type = btn.getAttribute('data-log');
      const amount = parseInt(btn.getAttribute('data-amount'));
      logNonNegotiable(type, amount);
    };
  });
}

// --- ENHANCED DUNGEON SYSTEM WITH UNDERLINGS ---
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

// Enhanced HUD to show underling progress
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

// Enhanced shot handler for underlings
function onShotEnd(info) {
  const raid = state.raid;
  const d = buildDungeonList().find(x => x.id === raid.dungeon);
  const dv = derived();
  const base = projectile();
  
  const stat = dv.ATK + dv.DEX * 0.4 + dv.INT * 0.2;
  const impact = info?.impact || 0;
  const mult = info?.mult || 1;
  const dmg = Math.max(0, Math.round(impact * (stat / 20) * mult - (d.boss.def) + (base.splash ? base.splash / 2 : 0)));
  
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

// Enhanced raid finish with underling consequences
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

// Enhanced end screen to show underling results
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

// Enhanced quest rendering for non-negotiables
function renderQuests() {
  const list = $('questList');
  if (!list) return;
  list.innerHTML = '';
  
  // ... existing quest rendering code ...
  
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
  
  // ... existing event listener code ...
}

// Enhanced render function to include new features
function render() {
  // ... existing render code ...
  
  // NEW: Add non-negotiable logging interface
  addNonNegotiableLogging();
  
  // ... rest of existing render code ...
}

// Reset non-negotiables progress on daily reset
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

// Update the buildUI function to include enhanced avatar definitions
function buildUI() {
  // ... existing buildUI code ...
  
  // ENHANCE: Update the avatar SVG definitions for better class weapons
  const avatarSVG = document.getElementById('avatarSVG');
  if (avatarSVG) {
    // Add more weapon gradient definitions
    const defs = avatarSVG.querySelector('defs') || (() => {
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      avatarSVG.prepend(d);
      return d;
    })();
    
    // Add staff gradient
    if (!defs.querySelector('#staffGradient')) {
      const staffGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      staffGrad.id = 'staffGradient';
      staffGrad.innerHTML = '<stop offset="0" stop-color="#ffd700"/><stop offset="1" stop-color="#ff8c00"/>';
      defs.appendChild(staffGrad);
    }
    
    // Add dagger gradient  
    if (!defs.querySelector('#daggerGradient')) {
      const daggerGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      daggerGrad.id = 'daggerGradient';
      daggerGrad.innerHTML = '<stop offset="0" stop-color="#c0c0c0"/><stop offset="1" stop-color="#808080"/>';
      defs.appendChild(daggerGrad);
    }
  }
  
  // ... rest of buildUI code ...
}
