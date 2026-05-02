export const GAME_EVENTS = {
  // Client → Server
  INIT_GAME: 'init_game',
  MOVE: 'move',
  RESIGN: 'resign',
  // Server → Client
  GAME_INIT: 'game_init',
  MOVE_MADE: 'move_made',
  GAME_OVER: 'game_over',
  GAME_ERROR: 'game_error',
  WAITING: 'waiting',
} as const
