export const MAIN_CODES_STRING = {
  LOBBY: "lobby_msg",
  STORY: "story_msg",
  PVP: "pvp_msg",
} as const;

export const MESSAGE_CODES = {

  LOBBY: 2001,
  STORY: 2002,
  PVP: 2003,

  PVP_TO_CLIENT: {
    ALL_PLAYERS_READY: 1,
    GAME_PREPARED: 2,
    GAME_COUNTDOWN: 3,
    GAME_STARTED: 4,
    BATTLE_TIME_COUNTDOWN: 5,
    SPAWN_ITEM: 6,
    GATE_STATE_CHANGED: 7,
    GATE_RESET_PROCESSED_IDS: 8,
    DEFENDER_HERO_ADDED: 9,
    BATTLE_ENDED: 10,
    ATTACKER_TROOP_SPAWNED: 11,
    DEFENDER_TRANSFORM_UPDATED: 12,
    DEFENDER_ADD_SOLDIER: 13,
    DEFENDER_DAMAGED: 15,
    SYNC_ITEM_EVENT: 16
  },

  PVP_FROM_CLIENT: {
    PLAYER_READY: 1,
    ALL_DEFENDER_DEAD: 10,
    ATTACKER_SPAWN: 11,
    DEFENDER_UPDATE_TRANSFORM: 12,
    DEFENDER_ADD_SOLDIER: 13,
    DEFENDER_TAKE_DAMAGE: 15
  },

} as const;

export function createMessage(mainCode: number, subCode: number, data: any = {}) {
  return {
    main_code: mainCode,
    sub_code: subCode,
    data: data,
    timestamp: Date.now()
  };
}

export function broadcastCodedMessage(room: any, mainCode: number, subCode: number, data: any = {}) {
  const message = createMessage(mainCode, subCode, data);
  switch (mainCode) {
    case MESSAGE_CODES.LOBBY:
      room.broadcast(MAIN_CODES_STRING.LOBBY, message);
      break;
    case MESSAGE_CODES.STORY:
      room.broadcast(MAIN_CODES_STRING.STORY, message);
      break;
    case MESSAGE_CODES.PVP:
      room.broadcast(MAIN_CODES_STRING.PVP, message);
      break;
    default:
      break;
  }
}