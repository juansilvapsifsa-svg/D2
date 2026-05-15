import { Card } from './data/cards';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface GameState {
  currentCardIndex: number;
  deck: string[]; // Array of card IDs
  hotConsent: {
    [userId: string]: boolean;
  };
  lastAction?: {
    type: 'skip' | 'next' | 'consent_match' | 'consent_fail';
    timestamp: number;
  };
}

export interface Reaction {
  id: string;
  type: string;
  userId: string;
  timestamp: number;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: {
    p1: string | null;
    p2: string | null;
  };
  playerNames: {
    [userId: string]: string;
  };
  gameState: GameState;
  reactions: Reaction[];
  createdAt: any;
  updatedAt: any;
}
