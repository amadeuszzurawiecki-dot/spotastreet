import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
// RoundResult overlay removed — results now shown via HUD + map tooltips + bottom bar action
import QuizSummary from '../components/QuizSummary';
import StreetAutocomplete from '../components/StreetAutocomplete';
import GameVariantSelect from '../components/GameVariantSelect';
import useUserProfile from '../hooks/useUserProfile';
import { selectRandomStreets, loadStreetNames, loadStreets, normalizeStreetName } from '../utils/streets';
import { distanceToStreet, getCombinedBounds, getStreetBounds, haversineDistance } from '../utils/geo';
import { createStreetGuessBotRound, isTrainingVariant } from '../features/game/gameBot';
import {
  advanceSingleplayerRound,
  createStreetGuessRoundResult,
  getEffectiveTotalRounds,
  shouldStartInitialRound,
} from '../features/game/gameRound';
import { scoreStreetGuess } from '../features/game/gameScoring';
import {
  getSummaryBotRounds,
  getSummaryBotScore,
  getSummaryTotalRounds,
  resetSingleplayerSummary,
} from '../features/game/gameSummary';
import useSingleplayerGame from '../features/game/useSingleplayerGame';
import { AVATARS } from '../data/avatars';
import './GamePage.css';

function GameWhatStreet() {
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
  const [allStreets, setAllStreets] = useState([]);
  const [streetNames, setStreetNames] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [playerRounds, setPlayerRounds] = useState([]);
  const [botRounds, setBotRounds] = useState([]);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [currentBotResult, setCurrentBotResult] = useState(null);
  const [streetBounds, setStreetBounds] = useState(null);
  const [playerGuessPosition, setPlayerGuessPosition] = useState(null);
  const [botGuessPosition, setBotGuessPosition] = useState(null);
  const [answerTargetPoint, setAnswerTargetPoint] = useState(null);
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
    gameMode: 'what-street',
    streets: [...streets],
    isTraining: isTrainingVariant(gameVariant),
    challengeId: challenge?.id,
  });

  const setFinalRoundSummary = (summaryValues) => {
    const roundsLimit = getEffectiveTotalRounds(totalRounds, streets.length);
    if (currentRound + 1 >= roundsLimit) {
      setSummaryData(createSummaryData(summaryValues));
    }
  };

  const getStreetAnchorPoint = useCallback((street) => {
    const segments = street?.segments || [];
    const longestSegment = segments.reduce((best, segment) => (
      segment.length > best.length ? segment : best
    ), []);

    if (longestSegment.length === 0) return null;
    return longestSegment[Math.floor(longestSegment.length / 2)];
  }, []);

  const findStreetByName = useCallback((name) => {
    const normalized = normalizeStreetName(name || '');
    return allStreets.find(street => normalizeStreetName(street.name) === normalized) || null;
  }, [allStreets]);

  const getGuessPosition = useCallback((guessedName, targetPoint) => {
    const guessedStreet = findStreetByName(guessedName);
    if (!guessedStreet || !targetPoint) return null;
    const result = distanceToStreet(targetPoint, guessedStreet.segments);
    return result.closestPoint || getStreetAnchorPoint(guessedStreet);
  }, [findStreetByName, getStreetAnchorPoint]);

  // Load data based on selected variant
  useEffect(() => {
    if (gameVariant === 'select') return;

    async function load() {
      setLoading(true);
      const names = await loadStreetNames();
      const all = await loadStreets();
      setStreetNames(names);
      setAllStreets(all);

      let selected = [];
      if (gameVariant === 'challenge' && challenge && challenge.streets && challenge.streets.length > 0) {
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

  // Handle timer expiry
  const handleTimerExpire = useCallback(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const currentStreet = streets[currentRound];
    const { botResult, botRound, botScoreDelta } = createStreetGuessBotRound(gameVariant, currentStreet?.name, streetNames);
    const targetPoint = getStreetAnchorPoint(currentStreet);
    const botPosition = !isTrainingVariant(gameVariant)
      ? getGuessPosition(botResult.guess, targetPoint)
      : null;

    setAnswerTargetPoint(targetPoint);
    setPlayerGuessPosition(null);
    setBotGuessPosition(botPosition);
    setCurrentBotResult(botResult);
    
    const playerResult = { score: 0, correct: false, timedOut: true };
    const nextPlayerRounds = [...playerRounds, playerResult];
    const nextBotScore = isTrainingVariant(gameVariant) ? 0 : botScore + botScoreDelta;
    const nextBotRounds = [...botRounds, botRound];

    setBotScore(nextBotScore);
    setBotRounds(nextBotRounds);
    setPlayerRounds(nextPlayerRounds);
    setFinalRoundSummary({
      playerScoreValue: playerScore,
      botScoreValue: nextBotScore,
      playerRoundsValue: nextPlayerRounds,
      botRoundsValue: nextBotRounds,
    });

    setRoundResult(createStreetGuessRoundResult({
      playerScore: 0,
      playerCorrect: false,
      playerDistance: undefined,
      timedOut: true,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botCorrect: isTrainingVariant(gameVariant) ? false : botResult.correct,
      botDistance: targetPoint && botPosition ? haversineDistance(targetPoint, botPosition) : undefined,
    }));
    setIsRoundActive(false);
    setShowResult(true);
  }, [
    botRounds,
    botScore,
    currentRound,
    gameVariant,
    getGuessPosition,
    getStreetAnchorPoint,
    playerRounds,
    playerScore,
    streetNames,
    streets,
    totalRounds,
  ]);

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
      primaryItemsReady: streets.length > 0,
      secondaryItemsReady: streetNames.length > 0,
      showResult,
    })) {
      startRound();
    }
  }, [streets, streetNames]);

  const startRound = (roundIdx = currentRound) => {
    hasSubmittedRef.current = false;
    setShowResult(false);
    setRoundResult(null);
    setCurrentBotResult(null);
    setPlayerGuessPosition(null);
    setBotGuessPosition(null);
    setAnswerTargetPoint(null);
    setIsRoundActive(true);

    // Calculate bounds for the street to fit it on screen
    const street = streets[roundIdx];
    if (street) {
      const bounds = getStreetBounds(street.segments);
      setStreetBounds(bounds);
    }

    startTimer();
  };

  const finishGameWithSummary = () => {
    setSummaryData(prev => prev || createSummaryData());
    finishGame();
  };

  // Handle street guess
  const handleGuess = (guessedName) => {
    if (!isRoundActive || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    stopTimer();

    const currentStreet = streets[currentRound];
    const score = scoreStreetGuess(guessedName, currentStreet.name);
    const isCorrect = score === 100;
    const { botResult, botRound, botScoreDelta } = createStreetGuessBotRound(gameVariant, currentStreet.name, streetNames);
    const targetPoint = getStreetAnchorPoint(currentStreet);
    const guessPosition = isCorrect
      ? targetPoint
      : getGuessPosition(guessedName, targetPoint);
    const botPosition = !isTrainingVariant(gameVariant)
      ? getGuessPosition(botResult.guess, targetPoint)
      : null;
    const playerDistance = targetPoint && guessPosition
      ? haversineDistance(targetPoint, guessPosition)
      : undefined;
    const botDistance = targetPoint && botPosition
      ? haversineDistance(targetPoint, botPosition)
      : undefined;

    setAnswerTargetPoint(targetPoint);
    setPlayerGuessPosition(guessPosition);
    setBotGuessPosition(botPosition);
    setCurrentBotResult(botResult);
    const nextPlayerScore = playerScore + score;
    const nextPlayerRounds = [...playerRounds, { score, correct: isCorrect, guess: guessedName, distance: playerDistance }];
    const nextBotScore = isTrainingVariant(gameVariant) ? 0 : botScore + botScoreDelta;
    const nextBotRounds = [...botRounds, botRound];

    setPlayerScore(nextPlayerScore);
    setPlayerRounds(nextPlayerRounds);
    setBotScore(nextBotScore);
    setBotRounds(nextBotRounds);
    setFinalRoundSummary({
      playerScoreValue: nextPlayerScore,
      botScoreValue: nextBotScore,
      playerRoundsValue: nextPlayerRounds,
      botRoundsValue: nextBotRounds,
    });

    setRoundResult(createStreetGuessRoundResult({
      playerScore: score,
      playerCorrect: isCorrect,
      playerDistance,
      timedOut: false,
      botScore: isTrainingVariant(gameVariant) ? 0 : botResult.score,
      botCorrect: isTrainingVariant(gameVariant) ? false : botResult.correct,
      botDistance,
    }));
    setIsRoundActive(false);
    setShowResult(true);
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
        gameTitle="Co to za ulica?" 
        gameIcon="scan" 
        onSelectVariant={(config) => {
          if (config.variant === 'multiplayer') {
            navigate('/game/multiplayer?mode=what-street');
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

  // 2. Loading
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
  const resultBounds = showResult
    ? getCombinedBounds(currentStreet?.segments, playerGuessPosition, answerTargetPoint)
    : streetBounds;

  return (
    <div className="game-page">
      {/* Map showing the street */}
      <GameMap
        onMapClick={() => {}} // No pin placement in this mode
        pinPosition={playerGuessPosition}
        streetSegments={currentStreet?.segments}
        showStreet={true} // Always show the street in this mode
        closestPoint={showResult ? answerTargetPoint : null}
        disabled={true}
        roundKey={currentRound}
        fitBounds={resultBounds}
        paddingOptions={{ padding: [40, 40], maxZoom: 18, animate: true, duration: 0.8 }}
        enableZoom={true}
        playerAvatar={avatar.emoji}
        playerAvatarImg={avatar.image}
        playerBg={avatar.bg}
        playerRoundScore={roundResult?.playerScore}
        playerRoundDistance={roundResult?.playerDistance}
        playerIsPremium={user.isPremium}
        botPinPosition={gameVariant !== 'training' ? botGuessPosition : null}
        botRoundScore={gameVariant !== 'training' ? roundResult?.botScore : undefined}
        botRoundDistance={gameVariant !== 'training' ? roundResult?.botDistance : undefined}
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
          {!showResult ? (
            <>
              <div className="hud-bottom-bar__round">Jaka to ulica?</div>
              <div className="hud-bottom-bar__target" style={{ marginBottom: '8px' }}>
                Rozpoznaj podświetloną ulicę
              </div>
              {isRoundActive && !hasSubmittedRef.current && (
                <StreetAutocomplete
                  streetNames={streetNames}
                  onSubmit={handleGuess}
                  disabled={!isRoundActive}
                />
              )}
            </>
          ) : (
            <>
              <div className="hud-bottom-bar__round" style={{ color: roundResult?.playerCorrect ? 'var(--green-primary)' : '#F44336' }}>
                {roundResult?.playerCorrect ? 'Dobra odpowiedź!' : (roundResult?.timedOut ? 'Czas minął!' : 'Błędna odpowiedź!')}
              </div>
              <div className="hud-bottom-bar__target">
                To ulica: <span className="hud-bottom-bar__target-highlight">{(currentStreet?.name || '').toUpperCase()}</span>
              </div>
              <div className="hud-bottom-bar__details" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '16px' }}>
                <span>
                  Ty: <strong style={{ color: 'var(--green-primary)' }}>+{roundResult?.playerScore} pkt</strong>
                  {typeof roundResult?.playerDistance === 'number' && ` (${Math.round(roundResult.playerDistance)}m)`}
                </span>
                {gameVariant !== 'training' && (
                  <span>
                    Bot: <strong style={{ color: '#FF9800' }}>+{roundResult?.botScore} pkt</strong>
                    {typeof roundResult?.botDistance === 'number' && ` (${Math.round(roundResult.botDistance)}m)`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="hud-bottom-action">
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

export default GameWhatStreet;
