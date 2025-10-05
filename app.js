// Hunter Training v4.4 - Complete Game Logic
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
        this.registerServiceWorker();
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
            document.getElementById('steps-input').value = this.playerData.dailyActivity.steps;
            document.getElementById('water-input').value = this.playerData.dailyActivity.water;

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
