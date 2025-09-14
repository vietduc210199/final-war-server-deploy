import { Room, Client } from "@colyseus/core";
import { PvPRoomState, PlayerState, AttackerTroop, Hero, DefenderTroop } from "./schema/PvPRoomState";
import { MESSAGE_CODES, broadcastCodedMessage, MAIN_CODES_STRING} from "./MessageCodes";
import * as fs from 'fs';
import * as path from 'path';

export class PvPRoom extends Room<PvPRoomState> {
  maxClients = 2;
  maxMapId = 3;
  private levelData: any = null;
  private defHeroesData: any = null;
  private attackersData: any = null;
  private gateCycleInterval: NodeJS.Timeout | null = null;

  onCreate(options: any) {
    this.state = new PvPRoomState();
    this.state.mapId = Math.floor(Math.random() * this.maxMapId) + 1;
    this.levelData = this.loadLevelData();
    this.defHeroesData = this.loadDefHeroesData();
    this.attackersData = this.loadAttackersData();

    // Set up message handlers
    this.setupMessageHandlers();
    console.log("PvP Room created:", this.roomId, "Map ID:", this.state.mapId);
  }

  onJoin(client: Client, options: any) {
    console.log(`Player ${client.sessionId} joined PvP room!`);
    console.log(`Current players in room: ${this.state.players.size}/${this.maxClients}`);
    console.log(`Current game state: ${this.state.gameState}`);

    // Reject join if room has 1 player and game was already running
    if (this.state.players.size === 1 && (this.state.gameState === "playing" || this.state.gameState === "finished")) {
      console.log(`Rejecting ${client.sessionId} - room has 1 player from previous game`);
      client.leave(1000, "Room has 1 player from previous game. Please try again.");
      return;
    }

    const playerState = new PlayerState();
    playerState.id = client.sessionId;
    playerState.name = options.playerName || `Player_${client.sessionId}`;

    if (this.state.players.size === 0) {
      playerState.role = "attacker";
      this.initializeAttackerData(playerState);
      console.log(`Player ${client.sessionId} assigned role: Attacker`);
    } else {
      playerState.role = "defender";
      this.initializeDefenderData(playerState);
      console.log(`Player ${client.sessionId} assigned role: Defender`);
    }

    this.state.players.set(client.sessionId, playerState);

    if (this.state.players.size === 2) {
      // Check if game was already running and reset it
      if (this.state.gameState === "playing" || this.state.gameState === "finished") {
        console.log("Resetting game state for new players");
        this.state.gameState = "ready";
      }
      this.prepareGame();
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`Player ${client.sessionId} left PvP room!`);

    this.state.players.delete(client.sessionId);

    if (this.state.players.size < 2) {
      this.state.gameState = "waiting";
      console.log("Game reset to waiting state - not enough players");
      
      // Auto dispose room when player leaves during game
      if (this.state.players.size === 0) {
        console.log("No players left, disposing room...");
        setTimeout(() => {
          this.disconnect();
        }, 2000); // Dispose room after 2 seconds
      }
    }
  }

  onDispose() {
    console.log("PvP Room disposing:", this.roomId);
    
    if (this.battleTimer) {
      clearInterval(this.battleTimer);
      this.battleTimer = null;
      console.log("Battle timer cleared on dispose");
    }
    
    if (this.gateCycleInterval) {
      clearInterval(this.gateCycleInterval);
      this.gateCycleInterval = null;
      console.log("Gate cycle timer cleared on dispose");
    }
  }

  private setupMessageHandlers() {

    this.onMessage(MAIN_CODES_STRING.PVP, (client, message) => {
      this.handleCodedMessage(client, message);
    });

    this.onMessage("AllDefenderDead", (client, data) => {
      this.endBattle(false);
    });

    this.onMessage("AttackerSpawn", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === "attacker") {
        console.log(`Player ${client.sessionId} spawning attacker troop:`, data);
        const validation = this.validateAttackerSpawn(data);
        if (!validation.isValid) {
          this.sendError(client, "INVALID_ATTACKER_SPAWN", validation.errorMessage, "AttackerSpawn");
          return;
        }

        const dataAttacker = this.attackersData.attackers.find((attacker: any) => attacker.attackerId === data.AttackerId);
        if(!dataAttacker) {
          this.sendError(client, "INVALID_ATTACKER_ID", "Invalid attacker ID", "AttackerSpawn");
          return;
        }
        const newTroop = new AttackerTroop();
        newTroop.isBoss = dataAttacker.isBoss;
        newTroop.hp = dataAttacker.hp;
        newTroop.damage = dataAttacker.damage;
        newTroop.damageToBox = dataAttacker.damageToBox;

        player.attackerTroops.push(newTroop);
        this.broadcast("AttackerTroopSpawned", {
          PlayerId: client.sessionId,
          PositionX: data.PositionX,
          IsBoss: dataAttacker.isBoss,
          HP: dataAttacker.hp,
          Damage: dataAttacker.damage,
          DamageToBox: dataAttacker.damageToBox,
          TroopIndex: player.attackerTroops.length - 1,
          TroopId: data.TroopId || player.attackerTroops.length - 1
        });

        console.log(`Attacker troop spawned for player ${client.sessionId}. Total troops: ${player.attackerTroops.length}`);
      } else {
        this.sendError(client, "INVALID_ROLE", "Only attackers can spawn troops", "AttackerSpawn");
      }
    });

    this.onMessage("DefenderUpdateTransform", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === "defender") {
        console.log(`Player ${client.sessionId} updating defender transform:`, data);

        this.broadcast("DefenderTransformUpdated", {
          PlayerId: client.sessionId,
          PositionX: data.PositionX
        });

        console.log(`Defender transform updated for player ${client.sessionId} at position X: ${data.PositionX}`);
      } else {
        console.warn(`Player ${client.sessionId} tried to update defender transform but is not a defender or not found`);
      }
    });

    this.onMessage("DefenderAddSoldier", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === "defender") {
        const validation = this.validateDefenderAddSoldier(data);
        if (!validation.isValid) {
          this.sendError(client, "INVALID_DEFENDER_ADD_SOLDIER", validation.errorMessage, "DefenderAddSoldier");
          return;
        }

        console.log(`Player ${client.sessionId} adding defender soldiers:`, data);
        for (let i = 0; i < data.Num; i++) {
          const newSoldier = new DefenderTroop();
          newSoldier.type = data.Type;
          newSoldier.hp = data.HP;
          newSoldier.damage = data.Damage;
          player.defenderTroops.push(newSoldier);
        }

        this.broadcast("DefenderSoldiersAdded", {
          PlayerId: client.sessionId,
          Type: data.Type,
          Num: data.Num,
          HP: data.HP,
          Damage: data.Damage,
          TotalSoldiers: player.defenderTroops.length,
        });

        this.sendSuccess(client, `Added ${data.Num} ${data.Type} soldiers successfully`, "DefenderAddSoldier");
        console.log(`Added ${data.Num} ${data.Type} soldiers for player ${client.sessionId}. Total defender troops: ${player.defenderTroops.length}`);
      } else {
        this.sendError(client, "INVALID_ROLE", "Only defenders can add soldiers", "DefenderAddSoldier");
      }
    });

    this.onMessage("AttackerTroopTarget", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === "attacker") {
        console.log(`Player ${client.sessionId} targeting with attacker troop:`, data);

        this.broadcast("AttackerTroopTargeted", {
          playerId: client.sessionId,
          isHero: data.isHero,
          idTarget: data.idTarget
        });

        console.log(`Attacker troop targeting ${data.isHero ? 'hero' : 'soldier'} with ID: ${data.idTarget}`);
      } else {
        console.warn(`Player ${client.sessionId} tried to target with attacker troop but is not an attacker or not found`);
      }
    });

    this.onMessage("DefenderTakeDamage", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Validation
        // const validation = this.validateDefenderTakeDamage(data);
        // if (!validation.isValid) {
        //   this.sendError(client, "INVALID_DEFENDER_TAKE_DAMAGE", validation.errorMessage, "DefenderTakeDamage");
        //   return;
        // }

        console.log(`Player ${client.sessionId} (${player.role}) reporting defender damage:`, data);

        // Calculate remaining HP (simplified calculation)
        const remainingHP = Math.max(0, 100 - data.DamageAmount); // Simplified for demo

        // Broadcast damage event to all clients
        this.broadcast("DefenderDamaged", {
          PlayerId: client.sessionId,
          PlayerRole: player.role,
          IsHero: data.IsHero,
          HeroName: data.HeroName,
          IdTakenDamage: data.IdTakenDamage,
          DamageAmount: data.DamageAmount,
          AttackerTroopId: data.AttackerTroopId || 0,
          RemainingHP: remainingHP
        });

        this.sendSuccess(client, `Damage reported successfully`, "DefenderTakeDamage");
        console.log(`Defender ${data.IsHero ? 'hero' : 'soldier'} with ID ${data.IdTakenDamage} took ${data.DamageAmount} ${data.DamageType} damage (reported by ${player.role})`);
      } else {
        this.sendError(client, "PLAYER_NOT_FOUND", "Player not found in room", "DefenderTakeDamage");
      }
    });

    this.onMessage("playerDefItemEvent", (client, data) => {
      this.sendInfoItemEvent(data.index, data.id, data.numSolider);
    });
  }

  private prepareGame() {
    console.log("Preparing PvP game! Both players joined.");
    this.state.gameState = "ready";
    this.broadcast("gamePrepared", {
      message: "Game prepared! Both players joined.",
      players: Array.from(this.state.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      }))
    });

    // Countdown timer
    let countdown = 10;
    const countdownInterval = setInterval(() => {
      this.broadcast("gameCountdown", {
        message: `Game starting in ${countdown} seconds...`,
        countdown: countdown
      });
      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.startGame();
      }
    }, 1000);
  }

  private startGame() {
    console.log("Starting PvP game! Both players joined.");
    this.state.gameState = "playing";
    this.broadcast("gameStarted", {
      message: "Game started! Attacker vs Defender",
      players: Array.from(this.state.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      }))
    });

    this.startLevelSpawnSystem();
    this.startBattleTimer();
    this.startGateCycle();
  }

  private battleTimer: NodeJS.Timeout | null = null;

  private startBattleTimer() {
    console.log("Starting battle timer: 90 seconds");
    let timeLeft = 90; // 90 seconds battle time

    // Send initial time
    this.broadcast("battleTimeCountdown", {
      timeLeft: timeLeft,
      message: `Battle time: ${timeLeft} seconds remaining`
    });

    // Start countdown timer
    this.battleTimer = setInterval(() => {
      timeLeft--;

      if (timeLeft <= 0) {
        // Battle time ended
        this.endBattle(true);
        return;
      }

      // Broadcast countdown every second
      this.broadcast("battleTimeCountdown", {
        timeLeft: timeLeft,
        message: `Battle time: ${timeLeft} seconds remaining`
      });

      console.log(`Battle time remaining: ${timeLeft} seconds`);
    }, 1000);
  }

  private endBattle(isTimeout: boolean = false) {
    console.log("Battle time ended!");
    this.state.gameState = "finished";
    this.broadcast("battleEnded", {
      message: "Battle time ended!",
      reason: isTimeout ? "timeout" : "all defender dead",
      playerType: isTimeout ? 1 : 0
    });
    
    // Clear battle timer
    if (this.battleTimer) {
      clearInterval(this.battleTimer);
      this.battleTimer = null;
      console.log("Battle timer cleared");
    }
    
    this.stopGateCycle();
    
    console.log("Auto disposing room after battle end...");
    setTimeout(() => {
      this.disconnect();
    }, 5000); // Dispose room after 5 seconds
  }

  private checkAllPlayersReady() {
    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.isReady) {
        allReady = false;
      }
    });

    if (allReady && this.state.players.size === 2) {
      broadcastCodedMessage(this, MESSAGE_CODES.PVP, MESSAGE_CODES.PVP_TO_CLIENT.ALL_PLAYERS_READY, {
        players: Array.from(this.state.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          role: p.role
        })),
        message: "All players are ready to start!"
      });
    }
  }

  private initializeAttackerData(playerState: PlayerState) {
    console.log(`Initialized ${playerState.attackerTroops.length} attacker troops for player ${playerState.name}`);
  }

  private initializeDefenderData(playerState: PlayerState) {
    // Initialize default heroes

    if (this.defHeroesData) {
      this.defHeroesData.heroes.forEach((heroData: any) => {
        const hero = new Hero();
        hero.heroName = heroData.heroName;
        hero.hp = heroData.hp;
        hero.damage = heroData.damage;
        playerState.heroes.push(hero);

        this.addHeroToDefender(playerState, {
          heroName: heroData.heroName,
          hp: heroData.hp,
          damage: heroData.damage,
        });
      });
    } else {
      console.error("Defender heroes data not found.");
    }

    console.log(`Initialized ${playerState.heroes.length} heroes and ${playerState.defenderTroops.length} defender troops for player ${playerState.name}`);
  }

  private sendInfoItemEvent(index : number, id: number, numSolider: number) {
    this.clients.forEach(client => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === "attacker") {
        this.broadcast("syncItemEvent", { index: index, id: id, numSolider: numSolider })
      }
    });;
  }

  // Validation Methods
  private validateAttackerSpawn(data: any): { isValid: boolean; errorMessage: string } {
    if (typeof data.PositionX !== 'number' || data.PositionX < -100 || data.PositionX > 100) {
      return { isValid: false, errorMessage: "PositionX must be a number between -100 and 100" };
    }
    if (typeof data.IsBoss !== 'boolean') {
      return { isValid: false, errorMessage: "IsBoss must be a boolean" };
    }
    return { isValid: true, errorMessage: "" };
  }

  private validateDefenderAddSoldier(data: any): { isValid: boolean; errorMessage: string } {
    if (!data.Type || typeof data.Type !== 'string') {
      return { isValid: false, errorMessage: "Type must be a non-empty string" };
    }
    if (typeof data.Num !== 'number' || data.Num <= 0 || data.Num > 10) {
      return { isValid: false, errorMessage: "Num must be a number between 1 and 10" };
    }
    if (typeof data.HP !== 'number' || data.HP <= 0 || data.HP > 1000) {
      return { isValid: false, errorMessage: "HP must be a number between 1 and 1000" };
    }
    if (typeof data.Damage !== 'number' || data.Damage <= 0 || data.Damage > 500) {
      return { isValid: false, errorMessage: "Damage must be a number between 1 and 500" };
    }
    return { isValid: true, errorMessage: "" };
  }

  private validateDefenderTakeDamage(data: any): { isValid: boolean; errorMessage: string } {
    if (typeof data.IsHero !== 'boolean') {
      return { isValid: false, errorMessage: "IsHero must be a boolean" };
    }
    if (typeof data.IdTakenDamage !== 'number' || data.IdTakenDamage <= 0) {
      return { isValid: false, errorMessage: "IdTakenDamage must be a positive number" };
    }
    if (typeof data.DamageAmount !== 'number' || data.DamageAmount <= 0 || data.DamageAmount > 1000) {
      return { isValid: false, errorMessage: "DamageAmount must be a number between 1 and 1000" };
    }
    return { isValid: true, errorMessage: "" };
  }

  // Error Handling
  private sendError(client: Client, errorCode: string, errorMessage: string, originalMessage: string) {
    const error = {
      ErrorCode: errorCode,
      Message: errorMessage,
      OriginalMessage: originalMessage,
      PlayerId: client.sessionId,
      Timestamp: Date.now()
    };

    client.send("Error", error);
    console.warn(`Error sent to ${client.sessionId}: ${errorCode} - ${errorMessage}`);
  }

  private sendSuccess(client: Client, message: string, action: string) {
    const success = {
      Message: message,
      Action: action,
      PlayerId: client.sessionId,
      Timestamp: Date.now()
    };

    client.send("Success", success);
    console.log(`Success sent to ${client.sessionId}: ${message}`);
  }

  private startLevelSpawnSystem() {
    if (this.levelData) {
      console.log("Starting level spawn system!");
      this.levelData.items.forEach((item: any) => {
        setTimeout(() => {
          this.broadcast("SpawnItem", {
            index: item.i,
            itemId: item.id,
            position: {
              x: item.x,
              y: item.y,
              z: item.z
            },
            hp: item.hp,
            count: item.count || 1,
            spacing: item.sp || 1,
            time: item.time
          });
        }, item.time * 1000);
      });
    }
    else {
      console.error("Level data not found!");
    }
  }

  /**
   * Load level data from LevelPVP.json
   */
  private loadLevelData(): any {
    try {
      // Try multiple possible paths for LevelPVP.json
      const possiblePaths = [
        path.join(__dirname, '../config/LevelPVP.json'),  // Development path
        path.join(__dirname, '../../config/LevelPVP.json'), // Build path
        path.join(process.cwd(), 'config/LevelPVP.json'),   // Current working directory
        path.join(process.cwd(), 'src/config/LevelPVP.json') // Source directory
      ];

      let configPath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          console.log(`✅ Found LevelPVP.json at: ${configPath}`);
          break;
        }
      }

      if (!configPath) {
        console.error(`LevelPVP.json not found in any of these locations:`);
        possiblePaths.forEach(p => console.error(`  - ${p}`));
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`__dirname: ${__dirname}`);
        return null;
      }

      const fileContent = fs.readFileSync(configPath, 'utf8');
      const levelData = JSON.parse(fileContent);

      console.log(`✅ Loaded LevelPVP data: ${levelData.items?.length || 0} items`);
      return levelData;
    } catch (error) {
      console.error('Failed to load LevelPVP data:', error);
      return null;
    }
  }

  private loadDefHeroesData(): any {
    try {
      // Try multiple possible paths for DefenderHeroes.json
      const possiblePaths = [
        path.join(__dirname, '../config/DefenderHeroes.json'),  // Development path
        path.join(__dirname, '../../config/DefenderHeroes.json'), // Build path
        path.join(process.cwd(), 'config/DefenderHeroes.json'),   // Current working directory
        path.join(process.cwd(), 'src/config/DefenderHeroes.json') // Source directory
      ];

      let configPath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          console.log(`✅ Found DefenderHeroes.json at: ${configPath}`);
          break;
        }
      }

      if (!configPath) {
        console.error(`DefenderHeroes.json not found in any of these locations:`);
        possiblePaths.forEach(p => console.error(`  - ${p}`));
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`__dirname: ${__dirname}`);
        return null;
      }

      const fileContent = fs.readFileSync(configPath, 'utf8');
      const DefenderHeroes = JSON.parse(fileContent);

      console.log(`✅ Loaded DefenderHeroes data: ${DefenderHeroes.heroes?.length || 0} heroes`);
      return DefenderHeroes;
    } catch (error) {
      console.error('Failed to load DefenderHeroes data:', error);
      return null;
    }
  }

  private loadAttackersData(): any {
    try {
      // Try multiple possible paths for Atackers.json
      const possiblePaths = [
        path.join(__dirname, '../config/Atackers.json'),  // Development path
        path.join(__dirname, '../../config/Atackers.json'), // Build path
        path.join(process.cwd(), 'config/Atackers.json'),   // Current working directory
        path.join(process.cwd(), 'src/config/Atackers.json') // Source directory
      ];

      let configPath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          console.log(`✅ Found Atackers.json at: ${configPath}`);
          break;
        }
      }

      if (!configPath) {
        console.error(`Atackers.json not found in any of these locations:`);
        possiblePaths.forEach(p => console.error(`  - ${p}`));
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`__dirname: ${__dirname}`);
        return null;
      }

      const fileContent = fs.readFileSync(configPath, 'utf8');
      const Atackers = JSON.parse(fileContent);

      console.log(`✅ Loaded Atackers data: ${Atackers.attackers?.length || 0} attackers`);
      console.log("✅ Loaded Atackers data:", Atackers.attackers[0] || 0);
      return Atackers;
    } catch (error) {
      console.error('Failed to load Atackers data:', error);
      return null;
    }
  }

  private startGateCycle() {
    let isUp = false;

    this.gateCycleInterval = setInterval(() => {
      isUp = !isUp;

      if (isUp) {
        this.broadcast("GateStateChanged", {
          isUp: true,
          positionY: 0
        });
      } else {
        this.broadcast("GateStateChanged", {
          isUp: false,
          positionY: -3.25
        });
        this.broadcast("GateResetProcessedIds", {});
      }

    }, 2500);
  }

  private stopGateCycle() {
    if (this.gateCycleInterval) {
      clearInterval(this.gateCycleInterval);
      this.gateCycleInterval = null;
      console.log("Gate cycle stopped");
    }
  }

  private addHeroToDefender(playerState: PlayerState, heroData: { heroName: string; hp: number; damage: number }) {
    const hero = new Hero();
    hero.heroName = heroData.heroName;
    hero.hp = heroData.hp;
    hero.damage = heroData.damage;
    playerState.heroes.push(hero);

    this.broadcast("DefenderHeroAdded", {
      PlayerId: playerState.id,
      HeroName: hero.heroName,
      HP: hero.hp,
      Damage: hero.damage,
      HeroIndex: playerState.heroes.length - 1,
    });

    console.log(`Hero ${hero.heroName} added for defender ${playerState.name}`);
  }

  private handleCodedMessage(client: Client, message: any) {
    const { main_code, sub_code, data } = message;    
    switch (main_code) {
      case MESSAGE_CODES.PVP:
        this.handleRoomPvPMessage(client, sub_code, data);
        break;
      default:
        console.warn(`Unknown main_code: ${main_code}`);
    }
  }

  private handleRoomPvPMessage(client: Client, subCode: number, data: any) {
    switch (subCode) {
      case MESSAGE_CODES.PVP_FROM_CLIENT.PLAYER_READY:
        this.handlePlayerReady(client, data);
        break;
      default:
        console.warn(`Unknown ROOM_PVP sub_code: ${subCode}`);
    }
  }

  private handlePlayerReady(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isReady = data.isReady;
      player.name = data.nickname;
      console.log(`Player ${client.sessionId} ready status: ${data.isReady} with nickname: ${data.nickname}`);
      this.checkAllPlayersReady();
    }
  }
}