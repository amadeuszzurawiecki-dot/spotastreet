import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
// RoundResult overlay removed — results now shown via HUD + map tooltips + bottom bar action
import QuizSummary from '../components/QuizSummary';
import GameVariantSelect from '../components/GameVariantSelect';
import useUserProfile from '../hooks/useUserProfile';
import { distanceToPoint, getPointsCombinedBounds, LEGNICA_CENTER } from '../utils/geo';
import { generateBotCoordinates } from '../utils/bot';
import { createDistanceBotRound, isTrainingVariant } from '../features/game/gameBot';
import {
  advanceSingleplayerRound,
  createDistanceRoundResult,
  getEffectiveTotalRounds,
  shouldStartInitialRound,
} from '../features/game/gameRound';
import { scorePlaceDistance } from '../features/game/gameScoring';
import {
  getSummaryBotRounds,
  getSummaryBotScore,
  getSummaryTotalRounds,
  resetSingleplayerSummary,
} from '../features/game/gameSummary';
import useSingleplayerGame from '../features/game/useSingleplayerGame';
import { AVATARS } from '../data/avatars';
import './GamePage.css';

function GameWhereIsPlace() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserProfile();

  const challenge = location.state?.challenge;

  // Game Mode Variant State: 'select' | 'training' | 'ai' | 'challenge'
  const [gameVariant, setGameVariant] = useState(challenge ? 'challenge' : 'select');
  const [totalRounds, setTotalRounds] = useState(challenge ? challenge.rounds : 10);
  const [roundDuration, setRoundDuration] = useState(challenge ? challenge.timeLimit : 15);

  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
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
  const [showTarget, setShowTarget] = useState(false);
  const [currentBotResult, setCurrentBotResult] = useState(null);
  const hasSubmittedRef = useRef(false);

  // Load places dataset
  useEffect(() => {
    if (gameVariant === 'select') return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/data/popular_places.json');
        const data = await res.json();
        
        let selected = [];
        if (gameVariant === 'challenge' && challenge && challenge.streets && challenge.streets.length > 0) {
          challenge.streets.forEach(name => {
            const found = data.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
            if (found) selected.push(found);
          });
          
          // Pad if not enough
          if (selected.length < totalRounds) {
            const shuffled = [...data].sort(() => 0.5 - Math.random());
            shuffled.forEach(p => {
              if (selected.length < totalRounds && !selected.some(s => s.name === p.name)) {
                selected.push(p);
              }
            });
          }
          selected = selected.slice(0, totalRounds);
        } else {
          selected = [...data].sort(() => 0.5 - Math.random()).slice(0, totalRounds);
        }
        setPlaces(selected);
      } catch (err) {
        console.error('Failed to load places:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameVariant, totalRounds]);

  // Handle confirm
  const handleConfirm = () => {
    if (!pinPosition || !isRoundActive || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    stopTimer();

    const place = places[currentRound];
    const actualTarget = [place.lat, place.lng];
    const result = distanceToPoint(pinPosition, actualTarget);
    const score = scorePlaceDistance(result.distance);
    const { botResult, botRound, botScoreDelta } = createDistanceBotRound(gameVariant);

    setClosestPoint(actualTarget);
    setShowTarget(true);
    setCurrentBotResult(botResult);

    // Bot coordinates guess
    const botPin = generateBotCoordinates(actualTarget, botResult.distance);
    setBotPinPosition(botPin);

    setPlayerScore(prev => prev + score);
    setPlayerRounds(prev => [...prev, { score, distance: result.distance }]);

    setBotScore(prev => isTrainingVariant(gameVariant) ? 0 : prev + botScoreDelta);
    setBotRounds(prev => [...prev, botRound]);

    setRoundResult(createDistanceRoundResult({
      playerScore: score,
      playerDistance: result.distance,
      timedOut: false,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botDistance: isTrainingVariant(gameVariant) ? 0 : botResult.distance,
    }));

    setIsRoundActive(false);
    setShowResult(true);
  };

  // Handle timer expire
  const handleTimerExpire = () => {
    if (hasSubmittedRef.current) return;

    if (pinPosition) {
      handleConfirm();
      return;
    }

    hasSubmittedRef.current = true;
    const { botResult, botRound, botScoreDelta } = createDistanceBotRound(gameVariant);
    setCurrentBotResult(botResult);
    
    setBotScore(prev => isTrainingVariant(gameVariant) ? 0 : prev + botScoreDelta);
    setBotRounds(prev => [...prev, botRound]);

    const playerResult = { score: 0, distance: undefined, timedOut: true };
    setPlayerRounds(prev => [...prev, playerResult]);
    setShowTarget(true);

    const place = places[currentRound];
    const actualTarget = place ? [place.lat, place.lng] : LEGNICA_CENTER;
    const botPin = generateBotCoordinates(actualTarget, botResult.distance);
    setBotPinPosition(botPin);
    setClosestPoint(actualTarget);

    setRoundResult(createDistanceRoundResult({
      playerScore: 0,
      playerDistance: undefined,
      timedOut: true,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botDistance: isTrainingVariant(gameVariant) ? 0 : botResult.distance,
    }));
    setIsRoundActive(false);
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

  // Start first round
  useEffect(() => {
    if (shouldStartInitialRound({
      currentRound,
      isGameOver,
      isRoundActive,
      playerRounds,
      primaryItemsReady: places.length > 0,
      showResult,
    })) {
      startRound();
    }
  }, [places]);

  const startRound = () => {
    hasSubmittedRef.current = false;
    setPinPosition(null);
    setBotPinPosition(null);
    setClosestPoint(null);
    setShowTarget(false);
    setShowResult(false);
    setRoundResult(null);
    setCurrentBotResult(null);
    setIsRoundActive(true);
    startTimer();
  };

  const createSummaryData = () => ({
    playerScore,
    botScore: getSummaryBotScore(gameVariant, botScore),
    playerRounds: [...playerRounds],
    botRounds: [...getSummaryBotRounds(gameVariant, botRounds)],
    totalRounds: getSummaryTotalRounds(playerRounds, totalRounds, places.length),
    gameMode: 'where-is-place',
    places: [...places],
    isTraining: isTrainingVariant(gameVariant),
    challengeId: challenge?.id,
  });

  const finishGameWithSummary = () => {
    setSummaryData(createSummaryData());
    finishGame();
  };

  const handleMapClick = (position) => {
    if (isRoundActive && !hasSubmittedRef.current) {
      setPinPosition(position);
    }
  };

  const handleNext = () => {
    const nextRound = currentRound + 1;
    const roundsLimit = getEffectiveTotalRounds(totalRounds, places.length);
    if (nextRound >= roundsLimit) {
      finishGameWithSummary();
      return;
    }

    advanceSingleplayerRound({
      currentRound,
      finishGame: finishGameWithSummary,
      itemCount: places.length,
      setCurrentRound,
      startRound,
      totalRounds,
    });
  };

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
        places={summary.places}
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

  // 1. Selector screen
  if (gameVariant === 'select') {
    return (
      <GameVariantSelect 
        gameTitle="Gdzie jest to miejsce?" 
        gameIcon="target" 
        onSelectVariant={(config) => {
          if (config.variant === 'multiplayer') {
            navigate('/game/multiplayer?mode=where-is-place');
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

  // 2. Loading
  if (loading) {
    return (
      <div className="game-loading">
        <div className="game-loading__spinner" />
        <p>Ładowanie kultowych miejsc Legnicy...</p>
      </div>
    );
  }

  const avatar = user.avatarId === 'custom'
    ? { emoji: 'U', image: user.customAvatar, bg: 'transparent' }
    : (AVATARS.find(a => a.id === user.avatarId) || AVATARS[0]);
  const effectiveTotalRounds = getEffectiveTotalRounds(totalRounds, places.length);

  const currentPlace = places[currentRound];
  const actualTarget = currentPlace ? [currentPlace.lat, currentPlace.lng] : null;
  const summaryBounds = showResult && pinPosition && actualTarget ? getPointsCombinedBounds([pinPosition, actualTarget]) : null;
  const targetTitle = currentPlace ? currentPlace.name : '';

  return (
    <div className="game-page">
      {/* Map */}
      <GameMap
        onMapClick={handleMapClick}
        pinPosition={pinPosition}
        closestPoint={showTarget ? closestPoint : null}
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

      {/* HUD Bottom Bar — Figma layout */}
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
          <div className="hud-bottom-bar__round">Gdzie jest to miejsce?</div>
          <div className="hud-bottom-bar__target">
            <span className="hud-bottom-bar__target-highlight">{targetTitle}</span>
          </div>
        </div>

        <div className="hud-bottom-action">
          {isRoundActive && pinPosition && !hasSubmittedRef.current && (
            <button type="button" className="btn-primary btn-confirm" onClick={handleConfirm}>
              Zatwierdź cel
            </button>
          )}
          {showResult && (
            <button type="button" className="btn-primary btn-next" onClick={handleNext}>
              {currentRound + 1 >= effectiveTotalRounds ? 'Zakończ grę' : 'Następne miejsce'}
            </button>
          )}
        </div>

        <div className="hud-bottom-bar__footer">Spotastreet</div>
      </div>
    </div>
  );
}

export default GameWhereIsPlace;
