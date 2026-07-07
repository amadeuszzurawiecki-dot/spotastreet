import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
// RoundResult overlay removed — results now shown via HUD + map tooltips + bottom bar action
import QuizSummary from '../components/QuizSummary';
import GameVariantSelect from '../components/GameVariantSelect';
import useUserProfile from '../hooks/useUserProfile';
import { selectRandomStreets, loadStreets } from '../utils/streets';
import { distanceToStreet, getCombinedBounds, LEGNICA_CENTER } from '../utils/geo';
import { generateBotCoordinates } from '../utils/bot';
import { createDistanceBotRound, isTrainingVariant } from '../features/game/gameBot';
import {
  advanceSingleplayerRound,
  createDistanceRoundResult,
  getEffectiveTotalRounds,
  shouldStartInitialRound,
} from '../features/game/gameRound';
import { scoreStreetDistance } from '../features/game/gameScoring';
import {
  getSummaryBotRounds,
  getSummaryBotScore,
  getSummaryTotalRounds,
  resetSingleplayerSummary,
} from '../features/game/gameSummary';
import useSingleplayerGame from '../features/game/useSingleplayerGame';
import { AVATARS } from '../data/avatars';
import './GamePage.css';

function GameWhereIsStreet() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserProfile();

  const challenge = location.state?.challenge;
  
  // Game Mode Variant State: 'select' | 'training' | 'ai' | 'challenge'
  const [gameVariant, setGameVariant] = useState(challenge ? 'challenge' : 'select');
  const [totalRounds, setTotalRounds] = useState(challenge ? challenge.rounds : 10);
  const [roundDuration, setRoundDuration] = useState(challenge ? challenge.timeLimit : 15);

  const [loading, setLoading] = useState(true);
  const [streets, setStreets] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [playerRounds, setPlayerRounds] = useState([]);
  const [botRounds, setBotRounds] = useState([]);
  const [pinPosition, setPinPosition] = useState(null);
  const [botPinPosition, setBotPinPosition] = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [closestPoint, setClosestPoint] = useState(null);
  const [showStreet, setShowStreet] = useState(false);
  const [currentBotResult, setCurrentBotResult] = useState(null);
  const hasSubmittedRef = useRef(false);

  const createSummaryData = ({
    playerScoreValue = playerScore,
    botScoreValue = botScore,
    playerRoundsValue = playerRounds,
    botRoundsValue = botRounds,
  } = {}) => ({
    playerScore: playerScoreValue,
    botScore: getSummaryBotScore(gameVariant, botScoreValue),
    playerRounds: [...playerRoundsValue],
    botRounds: [...getSummaryBotRounds(gameVariant, botRoundsValue)],
    totalRounds: getSummaryTotalRounds(playerRoundsValue, totalRounds, streets.length),
    gameMode: 'where-is-street',
    streets: [...streets],
    isTraining: isTrainingVariant(gameVariant),
    challengeId: challenge?.id,
  });

  const setFinalRoundSummary = (summaryValues) => {
    const roundsLimit = getEffectiveTotalRounds(totalRounds, streets.length);
    const completedRounds = summaryValues?.playerRoundsValue?.length || currentRound + 1;
    if (completedRounds >= roundsLimit) {
      setSummaryData(createSummaryData(summaryValues));
    }
  };

  // Load streets based on chosen variant
  useEffect(() => {
    if (gameVariant === 'select') return;

    async function load() {
      setLoading(true);
      let selected = [];
      if (gameVariant === 'challenge' && challenge && challenge.streets && challenge.streets.length > 0) {
        const all = await loadStreets();
        challenge.streets.forEach(streetName => {
          const found = all.find(s => s.name.toLowerCase().trim() === streetName.toLowerCase().trim());
          if (found) selected.push(found);
        });

        // Pad if not enough
        if (selected.length < totalRounds) {
          const randoms = await selectRandomStreets(totalRounds);
          randoms.forEach(r => {
            if (selected.length < totalRounds && !selected.some(s => s.name === r.name)) {
              selected.push(r);
            }
          });
        }
        selected = selected.slice(0, totalRounds);
      } else {
        selected = await selectRandomStreets(totalRounds);
      }
      setStreets(selected);
      setLoading(false);
    }
    load();
  }, [gameVariant, totalRounds]);

  // Handle confirm
  const handleConfirm = () => {
    if (!pinPosition || !isRoundActive || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    stopTimer();

    const street = streets[currentRound];
    const result = distanceToStreet(pinPosition, street.segments);
    const score = scoreStreetDistance(result.distance);
    const { botResult, botRound, botScoreDelta } = createDistanceBotRound(gameVariant);

    setClosestPoint(result.closestPoint);
    setShowStreet(true);
    setCurrentBotResult(botResult);

    // Bot coordinates guess based on its simulated accuracy distance
    const botPin = generateBotCoordinates(result.closestPoint, botResult.distance);
    setBotPinPosition(botPin);

    const nextPlayerScore = playerScore + score;
    const nextPlayerRounds = [...playerRounds, { score, distance: result.distance }];
    const nextBotScore = isTrainingVariant(gameVariant) ? 0 : botScore + botScoreDelta;
    const nextBotRounds = [...botRounds, botRound];

    setPlayerScore(nextPlayerScore);
    setPlayerRounds(nextPlayerRounds);
    setBotScore(nextBotScore);
    setBotRounds(nextBotRounds);
    const finalSummaryValues = {
      playerScoreValue: nextPlayerScore,
      botScoreValue: nextBotScore,
      playerRoundsValue: nextPlayerRounds,
      botRoundsValue: nextBotRounds,
    };
    setFinalRoundSummary(finalSummaryValues);

    setRoundResult(createDistanceRoundResult({
      playerScore: score,
      playerDistance: result.distance,
      timedOut: false,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botDistance: isTrainingVariant(gameVariant) ? 0 : botResult.distance,
    }));

    setIsRoundActive(false);
    if (finishChallengeRoundIfComplete(finalSummaryValues)) return;
    setShowResult(true);
  };

  // Handle timer expiry
  const handleTimerExpire = () => {
    if (hasSubmittedRef.current) return;

    if (pinPosition) {
      handleConfirm();
      return;
    }

    hasSubmittedRef.current = true;
    const { botResult, botRound, botScoreDelta } = createDistanceBotRound(gameVariant);
    setCurrentBotResult(botResult);
    
    const playerResult = { score: 0, distance: undefined, timedOut: true };
    const nextPlayerRounds = [...playerRounds, playerResult];
    const nextBotScore = isTrainingVariant(gameVariant) ? 0 : botScore + botScoreDelta;
    const nextBotRounds = [...botRounds, botRound];

    setBotScore(nextBotScore);
    setBotRounds(nextBotRounds);
    setPlayerRounds(nextPlayerRounds);
    const finalSummaryValues = {
      playerScoreValue: playerScore,
      botScoreValue: nextBotScore,
      playerRoundsValue: nextPlayerRounds,
      botRoundsValue: nextBotRounds,
    };
    setFinalRoundSummary(finalSummaryValues);
    setShowStreet(true);

    const street = streets[currentRound];
    // Find some target coordinates for map rendering even on timeout
    const fallbackTarget = street.segments[0]?.[0] || LEGNICA_CENTER;
    const botPin = generateBotCoordinates(fallbackTarget, botResult.distance);
    setBotPinPosition(botPin);
    setClosestPoint(fallbackTarget);

    setRoundResult(createDistanceRoundResult({
      playerScore: 0,
      playerDistance: undefined,
      timedOut: true,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botDistance: isTrainingVariant(gameVariant) ? 0 : botResult.distance,
    }));
    setIsRoundActive(false);
    if (finishChallengeRoundIfComplete(finalSummaryValues)) return;
    setShowResult(true);
  };

  const {
    timeLeft,
    progress,
    isRunning,
    start: startTimer,
    stop: stopTimer,
    finishGame,
    handleExitGame,
  } = useSingleplayerGame({
    hasSubmittedRef,
    onTimerExpire: handleTimerExpire,
    roundDuration,
    setIsGameOver,
    setIsRoundActive,
    setShowResult,
  });

  useEffect(() => {
    if (gameVariant === 'challenge' && summaryData && !isGameOver) {
      finishGame();
    }
  }, [gameVariant, summaryData, isGameOver, finishGame]);

  // Start first round when streets are loaded
  useEffect(() => {
    if (shouldStartInitialRound({
      currentRound,
      isGameOver,
      isRoundActive,
      playerRounds,
      primaryItemsReady: streets.length > 0,
      showResult,
    })) {
      startRound();
    }
  }, [streets]);

  const startRound = () => {
    hasSubmittedRef.current = false;
    setPinPosition(null);
    setBotPinPosition(null);
    setClosestPoint(null);
    setShowStreet(false);
    setShowResult(false);
    setRoundResult(null);
    setCurrentBotResult(null);
    setIsRoundActive(true);
    startTimer();
  };

  const finishGameWithSummary = (summaryValues) => {
    setSummaryData(prev => prev || createSummaryData(summaryValues));
    finishGame();
  };

  const finishChallengeRoundIfComplete = (summaryValues) => {
    const roundsLimit = getEffectiveTotalRounds(totalRounds, streets.length);
    if (gameVariant !== 'challenge' || currentRound + 1 < roundsLimit) return false;
    finishGameWithSummary(summaryValues);
    return true;
  };

  // Handle map click
  const handleMapClick = (position) => {
    if (isRoundActive && !hasSubmittedRef.current) {
      setPinPosition(position);
    }
  };

  // Handle next round
  const handleNext = () => {
    const nextRound = currentRound + 1;
    const roundsLimit = getEffectiveTotalRounds(totalRounds, streets.length);
    if (nextRound >= roundsLimit) {
      finishGameWithSummary();
      return;
    }

    advanceSingleplayerRound({
      currentRound,
      finishGame: finishGameWithSummary,
      itemCount: streets.length,
      setCurrentRound,
      startRound,
      totalRounds,
    });
  };

  // 1. Selector screen
  if (gameVariant === 'select') {
    return (
      <GameVariantSelect 
        gameTitle="Gdzie jest ta ulica?" 
        gameIcon="pin" 
        onSelectVariant={(config) => {
          if (config.variant === 'multiplayer') {
            navigate('/game/multiplayer?mode=where-is-street');
            return;
          }
          setGameVariant(config.variant);
          setTotalRounds(config.rounds);
          setRoundDuration(config.timeLimit);
        }}
        onBack={() => navigate('/')}
      />
    );
  }

  // 2. Game over — show summary before any loading fallback
  if (isGameOver) {
    const summary = summaryData || createSummaryData();
    return (
      <QuizSummary
        playerScore={summary.playerScore}
        botScore={summary.botScore}
        playerRounds={summary.playerRounds}
        botRounds={summary.botRounds}
        totalRounds={summary.totalRounds}
        gameMode={summary.gameMode}
        streets={summary.streets}
        isTraining={summary.isTraining}
        challengeId={summary.challengeId}
        onPlayAgain={() => resetSingleplayerSummary({
          setBotRounds,
          setBotScore,
          setCurrentRound,
          setGameVariant,
          setIsGameOver,
          setPlayerRounds,
          setPlayerScore,
          setSummaryData,
        })}
        onExit={() => navigate('/')}
      />
    );
  }

  // 2. Loading state
  if (loading) {
    return (
      <div className="game-loading">
        <div className="game-loading__spinner" />
        <p>Ładowanie ulic Legnicy...</p>
      </div>
    );
  }

  const avatar = user.avatarId === 'custom'
    ? { emoji: 'U', image: user.customAvatar, bg: 'transparent' }
    : (AVATARS.find(a => a.id === user.avatarId) || AVATARS[0]);
  const effectiveTotalRounds = getEffectiveTotalRounds(totalRounds, streets.length);

  const currentStreet = streets[currentRound];
  const summaryBounds = showResult ? getCombinedBounds(currentStreet?.segments, pinPosition, closestPoint) : null;

  return (
    <div className="game-page">
      {/* Map */}
      <GameMap
        onMapClick={handleMapClick}
        pinPosition={pinPosition}
        streetSegments={currentStreet?.segments}
        showStreet={showStreet}
        closestPoint={closestPoint}
        disabled={!isRoundActive || hasSubmittedRef.current}
        roundKey={currentRound}
        fitBounds={summaryBounds}
        paddingOptions={showResult ? { paddingTopLeft: [40, 90], paddingBottomRight: [40, 320], maxZoom: 16, animate: true, duration: 0.8 } : null}
        
        // Results for permanent map tags
        playerAvatar={avatar.emoji}
        playerAvatarImg={avatar.image}
        playerBg={avatar.bg}
        playerRoundScore={roundResult?.playerScore}
        playerRoundDistance={roundResult?.playerDistance}
        playerIsPremium={user.isPremium}
        
        botPinPosition={gameVariant === 'ai' || gameVariant === 'battle' ? botPinPosition : null}
        botRoundScore={gameVariant === 'ai' || gameVariant === 'battle' ? roundResult?.botScore : undefined}
        botRoundDistance={gameVariant === 'ai' || gameVariant === 'battle' ? roundResult?.botDistance : undefined}
        showResultDetails={showResult}
      />

      {/* Unified HUD */}
      <GameHUD
        playerName={user.name}
        playerAvatar={avatar.image ? <img src={avatar.image} alt={user.name} /> : avatar.emoji}
        playerBg={avatar.bg}
        playerScore={playerScore}
        playerRoundPoints={roundResult?.playerScore}
        playerIsPremium={user.isPremium}
        
        opponentName="Legniczanin"
        opponentAvatar="AI"
        opponentScore={botScore}
        opponentRoundPoints={roundResult?.botScore}
        
        timeLeft={timeLeft}
        progress={progress}
        isRunning={isRunning}
        
        currentRound={currentRound + 1}
        totalRounds={effectiveTotalRounds}
        isTraining={gameVariant === 'training'}
        isChallenge={gameVariant === 'challenge'}
        isShowingResult={showResult}
        onBackClick={handleExitGame}
      />

      {/* HUD Bottom Bar — Figma layout: info card + action button stacked */}
      <div 
        className="hud-bottom-bar"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="hud-bottom-bar__info">
          <div className="hud-bottom-bar__round">Gdzie jest ta ulica?</div>
          <div className="hud-bottom-bar__target">
            UL. <span className="hud-bottom-bar__target-highlight">{(currentStreet?.name || '').toUpperCase()}</span>
          </div>
        </div>

        {/* Action button — Zatwierdź cel OR Następna ulica */}
        <div className="hud-bottom-action">
          {isRoundActive && pinPosition && !hasSubmittedRef.current && (
            <button type="button" className="btn-primary btn-confirm" onClick={handleConfirm}>
              Zatwierdź cel
            </button>
          )}
          {showResult && (
            <button type="button" className="btn-primary btn-next" onClick={handleNext}>
              {currentRound + 1 >= effectiveTotalRounds ? 'Zakończ grę' : 'Następna ulica'}
            </button>
          )}
        </div>

        <div className="hud-bottom-bar__footer">Spotastreet</div>
      </div>
    </div>
  );
}

export default GameWhereIsStreet;
