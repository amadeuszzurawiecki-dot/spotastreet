import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
// RoundResult overlay removed — results now shown via HUD + map tooltips + bottom bar action
import QuizSummary from '../components/QuizSummary';
import StreetAutocomplete from '../components/StreetAutocomplete';
import GameVariantSelect from '../components/GameVariantSelect';
import { useTimer } from '../hooks/useTimer';
import useUserProfile from '../hooks/useUserProfile';
import { selectRandomStreets, loadStreetNames, loadStreets, normalizeStreetName } from '../utils/streets';
import { distanceToStreet, getCombinedBounds, getStreetBounds, haversineDistance } from '../utils/geo';
import { generateBotStreetGuess } from '../utils/bot';
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
  const [currentBotResult, setCurrentBotResult] = useState(null);
  const [streetBounds, setStreetBounds] = useState(null);
  const [playerGuessPosition, setPlayerGuessPosition] = useState(null);
  const [botGuessPosition, setBotGuessPosition] = useState(null);
  const [answerTargetPoint, setAnswerTargetPoint] = useState(null);
  const hasSubmittedRef = useRef(false);

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
    const botResult = generateBotStreetGuess(currentStreet?.name, streetNames);
    const targetPoint = getStreetAnchorPoint(currentStreet);
    const botPosition = gameVariant !== 'training'
      ? getGuessPosition(botResult.guess, targetPoint)
      : null;

    setAnswerTargetPoint(targetPoint);
    setPlayerGuessPosition(null);
    setBotGuessPosition(botPosition);
    setCurrentBotResult(botResult);
    
    if (gameVariant !== 'training') {
      setBotScore(prev => prev + botResult.score);
      setBotRounds(prev => [...prev, botResult]);
    } else {
      setBotScore(0);
      setBotRounds(prev => [...prev, { score: 0, correct: false }]);
    }

    const playerResult = { score: 0, correct: false, timedOut: true };
    setPlayerRounds(prev => [...prev, playerResult]);

    setRoundResult({
      type: 'street-guess',
      playerScore: 0,
      playerCorrect: false,
      playerDistance: undefined,
      timedOut: true,
      botScore: gameVariant !== 'training' ? botResult.score : 0,
      botCorrect: gameVariant !== 'training' ? botResult.correct : false,
      botDistance: targetPoint && botPosition ? haversineDistance(targetPoint, botPosition) : undefined,
    });
    setIsRoundActive(false);
    setShowResult(true);
  }, [streets, currentRound, streetNames, gameVariant]);

  const { timeLeft, progress, isRunning, start: startTimer, stop: stopTimer } = useTimer(roundDuration, handleTimerExpire);

  // Start first round
  useEffect(() => {
    if (streets.length > 0 && streetNames.length > 0 && !isRoundActive && !showResult && !isGameOver && currentRound === 0 && playerRounds.length === 0) {
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

  // Handle street guess
  const handleGuess = (guessedName) => {
    if (!isRoundActive || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    stopTimer();

    const currentStreet = streets[currentRound];
    const isCorrect = guessedName === currentStreet.name;
    const score = isCorrect ? 100 : 0;
    const botResult = generateBotStreetGuess(currentStreet.name, streetNames);
    const targetPoint = getStreetAnchorPoint(currentStreet);
    const guessPosition = isCorrect
      ? targetPoint
      : getGuessPosition(guessedName, targetPoint);
    const botPosition = gameVariant !== 'training'
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
    setPlayerScore(prev => prev + score);
    setPlayerRounds(prev => [...prev, { score, correct: isCorrect, guess: guessedName, distance: playerDistance }]);

    if (gameVariant !== 'training') {
      setBotScore(prev => prev + botResult.score);
      setBotRounds(prev => [...prev, botResult]);
    } else {
      setBotScore(0);
      setBotRounds(prev => [...prev, { score: 0, correct: false }]);
    }

    setRoundResult({
      type: 'street-guess',
      playerScore: score,
      playerCorrect: isCorrect,
      playerDistance,
      timedOut: false,
      botScore: gameVariant !== 'training' ? botResult.score : 0,
      botCorrect: gameVariant !== 'training' ? botResult.correct : false,
      botDistance,
    });
    setIsRoundActive(false);
    setShowResult(true);
  };

  // Handle next round
  const handleNext = () => {
    const nextRound = currentRound + 1;
    if (nextRound >= totalRounds) {
      setIsGameOver(true);
      setShowResult(false);
      return;
    }
    setCurrentRound(nextRound);
    startRound(nextRound);
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

  // 3. Game over
  if (isGameOver) {
    return (
      <QuizSummary
        playerScore={playerScore}
        botScore={gameVariant === 'training' ? 0 : botScore}
        playerRounds={playerRounds}
        botRounds={gameVariant === 'training' ? [] : botRounds}
        totalRounds={totalRounds}
        gameMode="what-street"
        streets={streets}
        isTraining={gameVariant === 'training'}
        challengeId={challenge?.id}
        onPlayAgain={() => {
          setIsGameOver(false);
          setCurrentRound(0);
          setPlayerScore(0);
          setBotScore(0);
          setPlayerRounds([]);
          setBotRounds([]);
          setGameVariant('select');
        }}
        onExit={() => navigate('/')}
      />
    );
  }

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
        totalRounds={totalRounds}
        isTraining={gameVariant === 'training'}
        isChallenge={gameVariant === 'challenge'}
        isShowingResult={showResult}
        onBackClick={() => {
          if (window.confirm('Czy na pewno chcesz zakończyć grę? Stracisz dotychczasowy postęp.')) {
            navigate('/');
          }
        }}
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
            <button className="btn-primary btn-next" onClick={handleNext}>
              {currentRound + 1 >= totalRounds ? 'Zakończ grę' : 'Następna ulica'}
            </button>
          )}
        </div>

        <div className="hud-bottom-bar__footer">Stworzono dla Legnickich Bolciarzy</div>
      </div>
    </div>
  );
}

export default GameWhatStreet;
