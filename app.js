// Hunter Training v4.4 - Complete Game Logic (Fixed for GitHub Pages)
class HunterTraining {
    constructor() {
        this.playerData = this.loadPlayerData();
        this.currentSection = 'character-section';
        this.raidActive = false;
        this.raidTimer = null;
        this.staleRaidTimer = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.updateDisplay();
        this.generateQuests();
        this.generateDungeons();
        this.generateShopItems();
        this.setupDailyReset();
        this.setupErrorHandling();
        
        console.log('Hunter Training v4.4 initialized successfully!');
    }

    loadPlayerData() {
        const defaultData = {
            level: 5,
            xp: 650,
            xpMax: 1000,
            gold: 150,
            ap: 45,
            apMax: 100,
            hp: 120,
            hpMax: 120,
            stats: {
                str: 12,
                vit: 10,
                spd: 8,
                dex: 14,
                int: 6,
                soc: 4
            },
            class: 'Warrior',
            equipment: {
                weapon: { name: 'Iron Sword', rarity: 'legendary', type: 'weapon' },
                boots: { name: 'Leather Boots', rarity: 'rare', type: 'boots' },
                tome: { name: 'Basic Tome', rarity: 'common', type: 'tome' },
                banner: null
            },
            inventory: [],
            dailyActivity: {
                steps: 4800,
                water: 1500,
                workouts: 0
            },
            quests: {},
            lastReset: new Date().toDateString(),
            version: '4.4.0'
        };

        try {
            const saved = localStorage.getItem('hunter-training-data');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migration for older versions
                if (!parsed.version) {
                    console.log('Migrating from older version...');
                    return { ...defaultData, ...parsed, version: '4.4.0' };
                }
                return parsed;
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
            this.showNotification('Error loading save data, using defaults', 'error');
        }

        return defaultData;
    }

    savePlayerData() {
        try {
            localStorage.setItem('hunter-training-data', JSON.stringify(this.playerData));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('Error saving game data', 'error');
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
                
                // Update active states
                navButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        } else {
            console.error('Section not found:', sectionId);
            this.showSection('character-section');
        }
    }

    setupEventListeners() {
        // Raid attack system
        const attackZone = document.getElementById('attack-zone');
        const projectile = document.getElementById('projectile');
        
        if (attackZone && projectile) {
            attackZone.addEventListener('click', () => {
                if (this.raidActive) {
                    this.launchAttack();
                }
            });
        }

        // Manual attack button
        const attackBtn = document.getElementById('attack-btn');
        if (attackBtn) {
            attackBtn.addEventListener('click', () => {
                if (this.raidActive) {
                    this.launchAttack();
                }
            });
        }

        // Flee button
        const fleeBtn = document.getElementById('flee-btn');
        if (fleeBtn) {
            fleeBtn.addEventListener('click', () => {
                this.endRaid(false);
            });
        }

        // Equipment slot clicks
        document.querySelectorAll('.equipment-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotType = e.currentTarget.dataset.slot;
                this.showEquipmentOptions(slotType);
            });
        });

        // Quest complete buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quest-complete')) {
                const questItem = e.target.closest('.quest-item');
                if (questItem) {
                    const questTitle = questItem.querySelector('h3').textContent;
                    this.completeQuest(questTitle);
                }
            }
        });
    }

    updateDisplay() {
        try {
            // Update HUD
            document.getElementById('gold').textContent = this.playerData.gold;
            document.getElementById('ap').textContent = `${this.playerData.ap}/${this.playerData.apMax}`;
            document.getElementById('hp').textContent = `${this.playerData.hp}/${this.playerData.hpMax}`;
            
            // Update character stats
            document.getElementById('level').textContent = this.playerData.level;
            document.getElementById('character-class').textContent = this.playerData.class;
            document.getElementById('xp-current').textContent = this.playerData.xp;
            document.getElementById('xp-max').textContent = this.playerData.xpMax;
            
            const xpPercent = (this.playerData.xp / this.playerData.xpMax) * 100;
            document.getElementById('xp-progress').style.width = `${xpPercent}%`;
            
            // Update stats
            Object.keys(this.playerData.stats).forEach(stat => {
                const element = document.getElementById(stat);
                if (element) {
                    element.textContent = this.playerData.stats[stat];
                }
            });

            // Update activity inputs
            const stepsInput = document.getElementById('steps-input');
            const waterInput = document.getElementById('water-input');
            if (stepsInput) stepsInput.value = this.playerData.dailyActivity.steps;
            if (waterInput) waterInput.value = this.playerData.dailyActivity.water;

            // Update equipment
            this.updateEquipmentDisplay();

        } catch (error) {
            console.error('Error updating display:', error);
        }
    }

    updateEquipmentDisplay() {
        Object.keys(this.playerData.equipment).forEach(slot => {
            const element = document.getElementById(`${slot}-slot`);
            if (element) {
                const item = this.playerData.equipment[slot];
                if (item) {
                    element.textContent = item.name;
                    element.className = `item ${item.rarity || 'common'}`;
                    element.classList.remove('empty');
                } else {
                    element.textContent = 'Empty';
                    element.className = 'item empty';
                }
            }
        });
    }

    generateQuests() {
        const questsList = document.getElementById('quests-list');
        if (!questsList) return;

        const quests = [
            {
                id: 'steps',
                title: 'Steps Challenge',
                description: `Walk ${this.getStepTarget()} steps`,
                progress: this.playerData.dailyActivity.steps,
                target: this.getStepTarget(),
                reward: { xp: 150, gold: 50 },
                type: 'daily'
            },
            {
                id: 'hydration',
                title: 'Hydration Goal',
                description: 'Drink 2000ml of water',
                progress: this.playerData.dailyActivity.water,
                target: 2000,
                reward: { xp: 100, gold: 25 },
                type: 'daily'
            },
            {
                id: 'pushups',
                title: 'Daily Push-ups',
                description: 'Complete 30 push-ups',
                progress: 30,
                target: 30,
                reward: { xp: 100, gold: 25 },
                type: 'non-negotiable',
                completed: true
            }
        ];

        questsList.innerHTML = quests.map(quest => this.createQuestHTML(quest)).join('');
    }

    getStepTarget() {
        return 8000 + (this.playerData.level * 200);
    }

    createQuestHTML(quest) {
        const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
        const isCompleted = quest.completed || quest.progress >= quest.target;
        const canComplete = quest.progress >= quest.target && !quest.completed;
        
        return `
            <div class="quest-item ${quest.type === 'non-negotiable' ? 'non-negotiable' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="quest-info">
                    <h3>${quest.title}</h3>
                    <p>${quest.description}</p>
                    <div class="quest-progress">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${progressPercent}%"></div>
                        </div>
                        <span>${quest.progress}/${quest.target}</span>
                    </div>
                </div>
                <div class="quest-reward">
                    <span>+${quest.reward.xp} XP</span>
                    <span>+${quest.reward.gold} Gold</span>
                </div>
                <button class="quest-complete" ${!canComplete ? 'disabled' : ''}>
                    ${isCompleted ? 'Completed' : 'Complete'}
                </button>
            </div>
        `;
    }

    completeQuest(questTitle) {
        let questReward = { xp: 100, gold: 25 }; // Default reward
        
        // Determine reward based on quest type
        if (questTitle.includes('Steps')) {
            questReward = { xp: 150, gold: 50 };
        } else if (questTitle.includes('Hydration')) {
            questReward = { xp: 100, gold: 25 };
        } else if (questTitle.includes('Push-ups')) {
            questReward = { xp: 100, gold: 25 };
        }

        this.playerData.xp += questReward.xp;
        this.playerData.gold += questReward.gold;
        
        this.checkLevelUp();
        this.updateDisplay();
        this.savePlayerData();
        
        this.showNotification(`Quest completed! +${questReward.xp} XP, +${questReward.gold} Gold`, 'success');
        
        // Regenerate quests to update completion state
        setTimeout(() => this.generateQuests(), 100);
    }

    generateDungeons() {
        const dungeonsGrid = document.getElementById('dungeons-grid');
        if (!dungeonsGrid) return;

        const dungeons = [
            { tier: 1, name: 'Goblin Cave', levelReq: 1, apCost: 10, bossHealth: 100 },
            { tier: 2, name: 'Spider Lair', levelReq: 3, apCost: 15, bossHealth: 200 },
            { tier: 3, name: 'Orc Fortress', levelReq: 5, apCost: 20, bossHealth: 300 },
            { tier: 4, name: 'Dragon Peak', levelReq: 8, apCost: 25, bossHealth: 500, locked: true },
            { tier: 5, name: 'Demon Realm', levelReq: 12, apCost: 30, bossHealth: 800, locked: true }
        ];

        dungeonsGrid.innerHTML = dungeons.map(dungeon => this.createDungeonHTML(dungeon)).join('');
    }

    createDungeonHTML(dungeon) {
        const isUnlocked = this.playerData.level >= dungeon.levelReq && !dungeon.locked;
        const canAfford = this.playerData.ap >= dungeon.apCost;
        
        return `
            <div class="dungeon-card ${!isUnlocked ? 'locked' : ''}" data-tier="${dungeon.tier}">
                <h3>${dungeon.name}</h3>
                <p>Tier ${dungeon.tier}</p>
                <p>Recommended: Lvl ${dungeon.levelReq}+</p>
                <p>AP Cost: ${dungeon.apCost}</p>
                <button class="dungeon-btn" 
                    onclick="game.startDungeon(${dungeon.tier})"
                    ${!isUnlocked || !canAfford ? 'disabled' : ''}>
                    ${!isUnlocked ? 'Locked' : canAfford ? 'Enter' : 'Need AP'}
                </button>
            </div>
        `;
    }

    startDungeon(tier) {
        const apCost = 10 + (tier * 5); // 10, 15, 20, etc.
        
        if (this.playerData.ap < apCost) {
            this.showNotification(`Not enough AP! Need ${apCost} AP. Complete quests to gain more Action Points.`, 'error');
            return;
        }

        this.playerData.ap -= apCost;
        this.showSection('raid-section');
        this.startRaid(tier);
        this.updateDisplay();
    }

    startRaid(tier) {
        this.raidActive = true;
        this.currentRaid = {
            tier: tier,
            bossHealth: tier * 100,
            maxBossHealth: tier * 100,
            startTime: Date.now()
        };

        // Update raid UI
        const raidTitle = document.getElementById('raid-title');
        const bossHealth = document.getElementById('boss-health');
        const bossInfo = document.getElementById('boss-info');
        
        if (raidTitle) raidTitle.textContent = `Tier ${tier} Dungeon`;
        if (bossHealth) bossHealth.style.width = '100%';
        if (bossInfo) bossInfo.textContent = `Tier ${tier} Boss - ${this.currentRaid.bossHealth}/${this.currentRaid.bossHealth} HP`;

        // Start raid timer (10 minutes)
        this.startRaidTimer(10 * 60);
        
        // Stale raid protection (10 minutes)
        this.staleRaidTimer = setTimeout(() => {
            if (this.raidActive) {
                this.endRaid(false);
                this.showNotification('Raid cancelled due to inactivity.', 'warning');
            }
        }, 10 * 60 * 1000);
    }

    startRaidTimer(seconds) {
        let timeLeft = seconds;
        this.updateRaidTimer(timeLeft);
        
        this.raidTimer = setInterval(() => {
            timeLeft--;
            this.updateRaidTimer(timeLeft);
            
            if (timeLeft <= 0) {
                this.endRaid(false);
                this.showNotification('Raid time expired!', 'warning');
            }
        }, 1000);
    }

    updateRaidTimer(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timerElement = document.getElementById('raid-timer');
        if (timerElement) {
            timerElement.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // Color coding
            if (seconds < 60) {
                timerElement.style.background = 'var(--danger)';
            } else if (seconds < 180) {
                timerElement.style.background = 'var(--warning)';
            } else {
                timerElement.style.background = 'var(--highlight)';
            }
        }
    }

    launchAttack() {
        if (!this.raidActive || !this.currentRaid) return;

        // Calculate damage based on stats
        const baseDamage = 10 + this.playerData.stats.str;
        const critChance = this.playerData.stats.dex * 0.01;
        const isCrit = Math.random() < critChance;
        const damage = Math.floor(baseDamage * (isCrit ? 2 : 1));

        this.currentRaid.bossHealth = Math.max(0, this.currentRaid.bossHealth - damage);
        const healthPercent = (this.currentRaid.bossHealth / this.currentRaid.maxBossHealth) * 100;

        // Update boss health display
        const bossHealth = document.getElementById('boss-health');
        const bossInfo = document.getElementById('boss-info');
        
        if (bossHealth) bossHealth.style.width = `${healthPercent}%`;
        if (bossInfo) bossInfo.textContent = `Tier ${this.currentRaid.tier} Boss - ${this.currentRaid.bossHealth}/${this.currentRaid.maxBossHealth} HP`;

        // Animate projectile
        this.animateProjectile();

        if (isCrit) {
            this.showNotification(`Critical Hit! ${damage} damage!`, 'success');
        }

        if (this.currentRaid.bossHealth <= 0) {
            this.completeRaid();
        }
    }

    animateProjectile() {
        const projectile = document.getElementById('projectile');
        if (!projectile) return;

        projectile.style.transition = 'none';
        projectile.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            projectile.style.transition = 'transform 0.5s ease';
            projectile.style.transform = 'translateY(-200px)';
        }, 10);

        setTimeout(() => {
            projectile.style.transition = 'transform 0.3s ease';
            projectile.style.transform = 'translateY(0)';
        }, 600);
    }

    completeRaid() {
        this.raidActive = false;
        this.clearRaidTimers();
        
        // Calculate rewards based on tier
        const xpReward = this.currentRaid.tier * 50;
        const goldReward = this.currentRaid.tier * 25;
        
        this.playerData.xp += xpReward;
        this.playerData.gold += goldReward;
        
        // Chance for loot
        const loot = this.generateLoot(this.currentRaid.tier);
        
        // Check level up
        this.checkLevelUp();
        
        // Show results
        this.showRaidResults(xpReward, goldReward, loot);
        this.savePlayerData();
        this.updateDisplay();
    }

    generateLoot(tier) {
        const lootTable = [
            'Health Potion', 'Mana Potion', 'Small Gold Bag', 
            'Enhancement Stone', 'Mysterious Scroll'
        ];
        const hasLoot = Math.random() < 0.3; // 30% chance for loot
        
        return hasLoot ? lootTable[Math.floor(Math.random() * lootTable.length)] : null;
    }

    showRaidResults(xp, gold, loot) {
        const modal = document.getElementById('raid-results');
        const rewards = document.getElementById('raid-rewards');
        
        if (!modal || !rewards) return;

        let rewardsHTML = `
            <div class="reward-item">
                <span>XP:</span>
                <span>+${xp}</span>
            </div>
            <div class="reward-item">
                <span>Gold:</span>
                <span>+${gold}</span>
            </div>
        `;
        
        if (loot) {
            rewardsHTML += `
                <div class="reward-item">
                    <span>Loot:</span>
                    <span>${loot}</span>
                </div>
            `;
            // Add to inventory
            this.playerData.inventory.push({ name: loot, type: 'consumable' });
        }
        
        rewards.innerHTML = rewardsHTML;
        modal.classList.add('active');
    }

    endRaid(victory) {
        this.raidActive = false;
        this.clearRaidTimers();
        
        if (!victory) {
            this.showSection('dungeons-section');
        }
    }

    clearRaidTimers() {
        if (this.raidTimer) {
            clearInterval(this.raidTimer);
            this.raidTimer = null;
        }
        if (this.staleRaidTimer) {
            clearTimeout(this.staleRaidTimer);
            this.staleRaidTimer = null;
        }
    }

    checkLevelUp() {
        if (this.playerData.xp >= this.playerData.xpMax) {
            this.playerData.level++;
            this.playerData.xp -= this.playerData.xpMax;
            this.playerData.xpMax = Math.floor(this.playerData.xpMax * 1.2);
            
            // Increase random stat
            const statKeys = Object.keys(this.playerData.stats);
            const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
            this.playerData.stats[randomStat]++;
            
            // Increase HP
            this.playerData.hpMax += 10;
            this.playerData.hp = this.playerData.hpMax;
            
            this.showNotification(
                `Level Up! You reached level ${this.playerData.level}! ${randomStat.toUpperCase()} increased!`,
                'success'
            );
            
            // Regenerate quests with new level requirements
            this.generateQuests();
            this.generateDungeons();
        }
    }

    // Activity Logging
    logSteps() {
        const stepsInput = document.getElementById('steps-input');
        if (!stepsInput) return;

        const steps = parseInt(stepsInput.value) || 0;
        
        if (steps > 0) {
            this.playerData.dailyActivity.steps = steps;
            const apGained = Math.floor(steps / 1000); // 1 AP per 1000 steps
            this.playerData.ap += apGained;
            this.playerData.ap = Math.min(this.playerData.ap, this.playerData.apMax);
            
            this.updateDisplay();
            this.generateQuests();
            this.savePlayerData();
            
            this.showNotification(`Logged ${steps} steps! +${apGained} AP`, 'success');
        } else {
            this.showNotification('Please enter a valid number of steps', 'error');
        }
    }

    logWater() {
        const waterInput = document.getElementById('water-input');
        if (!waterInput) return;

        const water = parseInt(waterInput.value) || 0;
        
        if (water > 0) {
            this.playerData.dailyActivity.water = water;
            this.updateDisplay();
            this.generateQuests();
            this.savePlayerData();
            
            this.showNotification(`Logged ${water}ml of water!`, 'success');
        } else {
            this.showNotification('Please enter a valid amount of water', 'error');
        }
    }

    // Shop System
    generateShopItems() {
        this.shopItems = [
            { id: 1, name: 'Steel Sword', type: 'weapon', rarity: 'rare', price: 100, stats: { str: 2 } },
            { id: 2, name: 'Magic Tome', type: 'tome', rarity: 'epic', price: 200, stats: { int: 3 } },
            { id: 3, name: 'Health Potion', type: 'consumable', rarity: 'common', price: 25 },
            { id: 4, name: 'Stamina Elixir', type: 'consumable', rarity: 'rare', price: 50 }
        ];
    }

    openShop() {
        const shopModal = document.getElementById('shop-modal');
        const shopItems = document.getElementById('shop-items');
        
        if (!shopModal || !shopItems) return;

        shopItems.innerHTML = this.shopItems.map(item => this.createShopItemHTML(item)).join('');
        shopModal.classList.add('active');
    }

    createShopItemHTML(item) {
        const canAfford = this.playerData.gold >= item.price;
        
        return `
            <div class="shop-item">
                <div class="shop-item-info">
                    <div class="shop-item-name ${item.rarity}">${item.name}</div>
                    <div class="shop-item-stats">${item.type} • ${item.rarity}</div>
                </div>
                <div class="shop-item-right">
                    <div class="shop-item-price">${item.price} Gold</div>
                    <button class="buy-btn" onclick="game.buyItem(${item.id})" 
                            ${!canAfford ? 'disabled' : ''}>
                        Buy
                    </button>
                </div>
            </div>
        `;
    }

    buyItem(itemId) {
        const item = this.shopItems.find(i => i.id === itemId);
        if (!item) return;

        if (this.playerData.gold >= item.price) {
            this.playerData.gold -= item.price;
            
            if (item.type === 'consumable') {
                this.playerData.inventory.push(item);
                this.showNotification(`Purchased ${item.name}!`, 'success');
            } else {
                // For equipment, auto-equip if slot is empty
                const slot = item.type;
                if (!this.playerData.equipment[slot]) {
                    this.playerData.equipment[slot] = item;
                    this.showNotification(`Purchased and equipped ${item.name}!`, 'success');
                } else {
                    this.playerData.inventory.push(item);
                    this.showNotification(`Purchased ${item.name}! Check your inventory.`, 'success');
                }
            }
            
            this.updateDisplay();
            this.savePlayerData();
            this.openShop(); // Refresh shop
        } else {
            this.showNotification('Not enough gold!', 'error');
        }
    }

    sellDuplicates() {
        const duplicates = this.findDuplicateItems();
        let totalGold = 0;

        duplicates.forEach(item => {
            totalGold += Math.floor((item.price || 50) * 0.5); // 50% of value
            const index = this.playerData.inventory.indexOf(item);
            if (index > -1) {
                this.playerData.inventory.splice(index, 1);
            }
        });

        if (totalGold > 0) {
            this.playerData.gold += totalGold;
            this.showNotification(`Sold duplicates for ${totalGold} gold!`, 'success');
            this.updateDisplay();
            this.savePlayerData();
        } else {
            this.showNotification('No duplicates found to sell.', 'info');
        }
    }

    findDuplicateItems() {
        const seen = new Set();
        const duplicates = [];

        this.playerData.inventory.forEach(item => {
            const key = `${item.name}-${item.rarity}`;
            if (seen.has(key)) {
                duplicates.push(item);
            } else {
                seen.add(key);
            }
        });

        return duplicates;
    }

    showEquipmentOptions(slotType) {
        const currentItem = this.playerData.equipment[slotType];
        if (currentItem) {
            this.showNotification(`Equipped: ${currentItem.name} (${currentItem.rarity})`, 'info');
        } else {
            this.showNotification(`${slotType.charAt(0).toUpperCase() + slotType.slice(1)} slot is empty`, 'info');
        }
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification`;
        notification.textContent = message;
        notification.style.background = 
            type === 'error' ? 'var(--danger)' : 
            type === 'warning' ? 'var(--warning)' : 
            type === 'success' ? 'var(--success)' : 'var(--accent)';

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    setupDailyReset() {
        const now = new Date();
        const today = new Date().toDateString();
        
        // Check if we need to reset (after 2 AM)
        if (this.playerData.lastReset !== today && now.getHours() >= 2) {
            this.dailyReset();
        }

        // Check every hour for reset
        setInterval(() => {
            const currentTime = new Date();
            if (currentTime.getHours() === 2 && currentTime.getMinutes() === 0) {
                this.dailyReset();
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    dailyReset() {
        const today = new Date().toDateString();
        if (this.playerData.lastReset === today) return;

        this.playerData.lastReset = today;
        this.playerData.dailyActivity = { steps: 0, water: 0, workouts: 0 };
        this.savePlayerData();
        
        this.showNotification('Daily progress has been reset! New quests available.', 'info');
        this.generateQuests();
        this.updateDisplay();
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showNotification('A minor error occurred. The game should still work.', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            e.preventDefault();
        });
    }
}

// Global functions for HTML onclick handlers
window.logSteps = function() {
    if (window.game) window.game.logSteps();
};

window.logWater = function() {
    if (window.game) window.game.logWater();
};

window.openShop = function() {
    if (window.game) window.game.openShop();
};

window.closeShop = function() {
    const shopModal = document.getElementById('shop-modal');
    if (shopModal) shopModal.classList.remove('active');
};

window.sellDuplicates = function() {
    if (window.game) window.game.sellDuplicates();
};

window.closeResults = function() {
    const resultsModal = document.getElementById('raid-results');
    if (resultsModal) resultsModal.classList.remove('active');
    if (window.game) window.game.showSection('dungeons-section');
};

window.startDungeon = function(tier) {
    if (window.game) window.game.startDungeon(tier);
};

window.buyItem = function(itemId) {
    if (window.game) window.game.buyItem(itemId);
};

// Initialize game with error handling
let game;

document.addEventListener('DOMContentLoaded', () => {
    try {
        game = new HunterTraining();
        window.game = game; // Make available globally for HTML handlers
        
        console.log('Hunter Training v4.4 loaded successfully!');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Fallback UI
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: white; background: #1a1a2e; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h1 style="color: #e94560; margin-bottom: 20px;">Hunter Training</h1>
                <p style="margin-bottom: 10px;">Failed to load the game. Please refresh the page.</p>
                <p style="color: #ff9800; margin-bottom: 20px;">Error: ${error.message}</p>
                <button onclick="window.location.reload()" style="background: #e94560; color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-size: 16px;">
                    Reload Game
                </button>
            </div>
        `;
    }
});

// Simple service worker registration (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
              }
