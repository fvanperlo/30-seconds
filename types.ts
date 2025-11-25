export interface GameCard {
  id: string;
  terms: string[];
  category?: string; // Optional category/topic name on the card
}

export enum AppState {
  INPUT = 'INPUT',
  PREVIEW = 'PREVIEW',
  GENERATING = 'GENERATING'
}

export interface GenerationConfig {
  topic: string;
  cardCount: number;
  useAi: boolean;
  manualTerms: string;
}
