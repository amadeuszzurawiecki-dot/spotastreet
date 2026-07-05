import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
// RoundResult overlay removed — results now shown via HUD + map tooltips + bottom bar action
import QuizSummary from '../components/QuizSummary';
import GameVariantSelect from '../components/GameVariantSelect';
import { useTimer } from '../hooks/useTimer';
import useUserProfile from '../hooks/useUserProfile';
import { selectRandomStreets, loadStreets } from '../utils/streets';
import { distanceToStreet, getCombinedBounds, LEGNICA_CENTER } from '../utils/geo';
import { calculateScore } from '../utils/scoring';
import { generateBotRound, generateBotCoordinates } from '../utils/bot';
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
  const [closestPoint, setClosestPoint] = useState(null);
  const [showStreet, setShowStreet] = useState(false);
  const [currentBotResult, setCurrentBotResult] = useState(null);
  const hasSubmittedRef = useRef(false);

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
    const score = calculateScore(result.distance);
    const botResult = generateBotRound();

    setClosestPoint(result.closestPoint);
    setShowStreet(true);
    setCurrentBotResult(botResult);

    // Bot coordinates guess based on its simulated accuracy distance
    const botPin = generateBotCoordinates(result.closestPoint, botResult.distance);
    setBotPinPosition(botPin);

    setPlayerScore(prev => prev + score);
    setPlayerRounds(prev => [...prev, { score, distance: result.distance }]);

    if (gameVariant !== 'training') {
      setBotScore(prev => prev + botResult.score);
      setBotRounds(prev => [...prev, botResult]);
    } else {
      setBotScore(0);
      setBotRounds(prev => [...prev, { score: 0, distance: 0 }]);
    }

    setRoundResult({
      type: 'distance',
      playerScore: score,
      playerDistance: result.distance,
      timedOut: false,
      botScore: gameVariant !== 'training' ? botResult.score : 0,
      botDistance: gameVariant !== 'training' ? botResult.distance : 0,
    });

    setIsRoundActive(false);
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
    const botResult = generateBotRound();
    setCurrentBotResult(botResult);
    
    if (gameVariant !== 'training') {
      setBotScore(prev => prev + botResult.score);
      setBotRounds(prev => [...prev, botResult]);
    } else {
      setBotScore(0);
      setBotRounds(prev => [...prev, { score: 0, distance: 0 }]);
    }

    const playerResult = { score: 0, distance: undefined, timedOut: true };
    setPlayerRounds(prev => [...prev, playerResult]);
    setShowStreet(true);

    const street = streets[currentRound];
    // Find some target coordinates for map rendering even on timeout
    const fallbackTarget = street.segments[0]?.[0] || LEGNICA_CENTER;
    const botPin = generateBotCoordinates(fallbackTarget, botResult.distance);
    setBotPinPosition(botPin);
    setClosestPoint(fallbackTarget);

    setRoundResult({
      type: 'distance',
      playerScore: 0,
      playerDistance: undefined,
      timedOut: true,
      botScore: gameVariant !== 'training' ? botResult.score : 0,
      botDistance: gameVariant !== 'training' ? botResult.distance : 0,
    });
    setIsRoundActive(false);
    setShowResult(true);
  };

  const { timeLeft, progress, isRunning, start: startTimer, stop: stopTimer } = useTimer(roundDuration, handleTimerExpire);

  const handleExitGame = () => {
    if (!window.confirm('Czy na pewno chcesz zakończyć grę? Stracisz dotychczasowy postęp.')) return;
    stopTimer();
    window.location.assign('/');
  };

  const finishGame = () => {
    stopTimer();
    hasSubmittedRef.current = true;
    setIsRoundActive(false);
    setShowResult(false);
    setIsGameOver(true);
  };

  // Start first round when streets are loaded
  useEffect(() => {
    if (streets.length > 0 && !isRoundActive && !showResult && !isGameOver && currentRound === 0 && playerRounds.length === 0) {
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

  // Handle map click
  const handleMapClick = (position) => {
    if (isRoundActive && !hasSubmittedRef.current) {
      setPinPosition(position);
    }
  };

  // Handle next round
  const handleNext = () => {
    const nextRound = currentRound + 1;
    const roundsLimit = Math.max(1, Math.min(Number(totalRounds) || 1, streets.length || Number(totalRounds) || 1));
    if (nextRound >= roundsLimit) {
      finishGame();
      return;
    }
    setCurrentRound(nextRound);
    startRound();
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

  // 3. Game over — show summary
  if (isGameOver) {
    return (
      <QuizSummary
        playerScore={playerScore}
        botScore={gameVariant === 'training' ? 0 : botScore}
        playerRounds={playerRounds}
        botRounds={gameVariant === 'training' ? [] : botRounds}
        totalRounds={totalRounds}
        gameMode="where-is-street"
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
          // Force reload or reselect random streets
          setGameVariant('select');
        }}
        onExit={() => navigate('/')}
      />
    );
  }

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
        totalRounds={totalRounds}
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
              {currentRound + 1 >= totalRounds ? 'Zakończ grę' : 'Następna ulica'}
            </button>
          )}
        </div>

        <div className="hud-bottom-bar__footer">Stworzono dla Legnickich Bolciarzy</div>
      </div>
    </div>
  );
}

export default GameWhereIsStreet;
