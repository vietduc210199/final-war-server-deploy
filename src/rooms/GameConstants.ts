/**
 * Game Constants
 * Centralized constants for PvP Room
 */
export const GAME_CONSTANTS = {
  // Battle timing
  BATTLE_DURATION_SECONDS: 105,
  BOSS_TRIGGER_TIME_SECONDS: 45, // Time remaining when boss spawns
  COUNTDOWN_SECONDS: 10,
  
  // Timers
  SERVER_TIME_INTERVAL_MS: 2000,
  CHANGE_MECHANICS_INTERVAL_MS: 10000,
  DEFENDER_SKILL_INTERVAL_MS: 10000,
  CHANGE_MAP_INTERVAL_MS: 30000,
  
  // Boss spawn
  BOSS_SPAWN_TIMEOUT_MS: 2000, // Increased from 1500ms for better network tolerance
  MAX_SKILL_POINTS: 2000,
  
  // Room settings
  MAX_CLIENTS: 2,
  MAX_MAP_ID: 8,
  
  // Validation limits
  POSITION_X_MIN: -100,
  POSITION_X_MAX: 100,
  SOLDIER_NUM_MIN: 1,
  SOLDIER_NUM_MAX: 10,
  HP_MIN: 1,
  HP_MAX: 1000,
  DAMAGE_MIN: 1,
  DAMAGE_MAX: 500,
  DAMAGE_AMOUNT_MAX: 1000,
  
  // Room disposal
  ROOM_DISPOSE_DELAY_MS: 5000,
  RECONNECTION_TIMEOUT_SECONDS: 30,
} as const;
