import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// Attacker Troop Schema
export class AttackerTroop extends Schema {
  @type("boolean") isBoss: boolean = false;
  @type("int32") attackerId: number = 0;
  @type("int32") hp: number = 100;
  @type("int32") damage: number = 10;
  @type("int32") damageToBox: number = 1;
}

// Hero Schema (for Defender)
export class Hero extends Schema {
  @type("string") heroName: string = "";
  @type("int32") id: number = 0;
  @type("int32") hp: number = 200;
  @type("int32") damage: number = 25;
}

// Defender Troop Schema
export class DefenderTroop extends Schema {
  @type("string") type: string = "soldier";
  @type("int32") hp: number = 80;
  @type("int32") damage: number = 15;
}

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") role: string = "attacker"; // "attacker" or "defender"
  @type("boolean") isReady: boolean = false;
  
  // Attacker-specific data
  @type([AttackerTroop]) attackerTroops = new ArraySchema<AttackerTroop>();
  
  // Defender-specific data
  @type([Hero]) heroes = new ArraySchema<Hero>();
  @type([DefenderTroop]) defenderTroops = new ArraySchema<DefenderTroop>();
}

export class PvPRoomState extends Schema {
  @type("string") gameState: string = "waiting"; // waiting, ready, playing, finished
  @type("int32") maxPlayers: number = 2;
  @type("int32") mapId: number = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}