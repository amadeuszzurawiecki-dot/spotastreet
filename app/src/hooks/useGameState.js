import { create } from 'zustand';
import { generateBotRound, generateBotStreetGuess } from '../utils/bot';

/**
 * Game state store using Zustand
 */
const useGameState = create((set, get) => ({
  // Game config
  gameMode: null, // 'where-is-street' | 'what-street'
  totalRounds: 10,
  roundDuration: 10, // seconds
  
  // Current game state
  currentRound: 0,
  isPlaying: false,
  isRoundActive: false,
  isShowingResult: false,
  isGameOver: false,
  
  // Streets for current game
  streets: [],
  
  // Player state
  playerScore: 0,
  playerRounds: [], // { score, distance?, correct? }
  
  // Bot state
  botScore: 0,
  botRounds: [], // { score, distance?, correct? }
  
  // Current round state
  currentStreet: null,
  pinPosition: null,
  
  // Actions
  startGame: (mode, streets) => {
    set({
      gameMode: mode,
      streets,
      totalRounds: Math.min(10, streets.length),
      currentRound: 0,
      isPlaying: true,
      isRoundActive: false,
      isShowingResult: false,
      isGameOver: false,
      playerScore: 0,
      playerRounds: [],
      botScore: 0,
      botRounds: [],
      currentStreet: null,
      pinPosition: null,
    });
  },
  
  startRound: () => {
    const { streets, currentRound } = get();
    set({
      currentStreet: streets[currentRound],
      isRoundActive: true,
      isShowingResult: false,
      pinPosition: null,
    });
  },
  
  setPin: (position) => {
    set({ pinPosition: position });
  },
  
  submitRound: (playerResult) => {
    const { playerScore, playerRounds, botScore, botRounds, gameMode, currentStreet } = get();
    
    // Generate bot result
    let botResult;
    if (gameMode === 'where-is-street') {
      botResult = generateBotRound();
    } else {
      // For 'what-street', bot result is generated separately
      botResult = playerResult.botResult || { score: 0, correct: false };
    }
    
    set({
      isRoundActive: false,
      isShowingResult: true,
      playerScore: playerScore + playerResult.score,
      playerRounds: [...playerRounds, playerResult],
      botScore: botScore + botResult.score,
      botRounds: [...botRounds, botResult],
    });
  },
  
  nextRound: () => {
    const { currentRound, totalRounds } = get();
    
    if (currentRound + 1 >= totalRounds) {
      set({ isGameOver: true, isShowingResult: false });
      return;
    }
    
    set({
      currentRound: currentRound + 1,
      isShowingResult: false,
    });
    
    // Auto-start next round
    get().startRound();
  },
  
  resetGame: () => {
    set({
      gameMode: null,
      currentRound: 0,
      isPlaying: false,
      isRoundActive: false,
      isShowingResult: false,
      isGameOver: false,
      streets: [],
      playerScore: 0,
      playerRounds: [],
      botScore: 0,
      botRounds: [],
      currentStreet: null,
      pinPosition: null,
    });
  },
}));

export default useGameState;
