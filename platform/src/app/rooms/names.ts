import type { Room } from '@core/types';
import type { MessageKey } from '@core/i18n/index';

export const ROOM_NAME: Record<Room, MessageKey> = { patterns: 'roomPatterns', games: 'roomGames', endgames: 'roomEndgames', openings: 'roomOpenings' };
export const ROOM_ABOUT: Record<Room, MessageKey> = { patterns: 'roomAboutPatterns', games: 'roomAboutGames', endgames: 'roomAboutEndgames', openings: 'roomAboutOpenings' };
