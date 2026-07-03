import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  db, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from '../config/firebase';
import useUserProfile from '../hooks/useUserProfile';
import useAppSettings from '../hooks/useAppSettings';
import GameMap from '../components/Map/GameMap';
import { GameHUD } from '../components/HUD/HUD';
import StreetAutocomplete from '../components/StreetAutocomplete';
import { selectRandomStreets, loadStreetNames, loadStreets, normalizeStreetName } from '../utils/streets';
import { 
  distanceToStreet, 
  distanceToPoint, 
  getCombinedBounds, 
  getPointsCombinedBounds, 
  getStreetBounds, 
  LEGNICA_CENTER 
} from '../utils/geo';
import { calculateScore, calculatePlaceScore } from '../utils/scoring';
import { generateBotRound, generateBotCoordinates, generateBotStreetGuess } from '../utils/bot';
import { AVATARS } from '../data/avatars';
import './Multiplayer.css';

const TOTAL_ROUNDS = 5;
const ROUND_DURATION = 20; // 20 seconds for multiplayer to make it more tactical
const SUMMARY_ROUTE_COLORS = ['#00E676', '#4FC3F7', '#FFD54F', '#FF8A65', '#CE93D8'];

function getSummaryLabelPosition(segments) {
  const longestSegment = (segments || [])
    .filter(segment => Array.isArray(segment) && segment.length > 0)
    .sort((a, b) => b.length - a.length)[0];

  if (!longestSegment) return null;
  return longestSegment[Math.floor(longestSegment.length / 2)];
}

function getSummaryMapBounds(items) {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;

  const includePoint = (point) => {
    if (!Array.isArray(point) || point.length < 2) return;
    const [lat, lng] = point;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  };

  items.forEach((item) => {
    includePoint(item.labelPosition);
    item.segments?.forEach(segment => segment.forEach(includePoint));
  });

  if (minLat === Infinity) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

function getRoundOutcomeStatus(myScore, opponentScore) {
  if ((myScore || 0) > (opponentScore || 0)) {
    return { status: 'won', statusLabel: 'wygrana' };
  }

  if ((myScore || 0) < (opponentScore || 0)) {
    return { status: 'lost', statusLabel: 'przegrana' };
  }

  return { status: 'draw', statusLabel: 'remis' };
}

export function Multiplayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useUserProfile();
  const appSettings = useAppSettings();

  const gameMode = searchParams.get('mode') || 'where-is-street';

  // Game flow states: 'matching' | 'playing' | 'waiting_opponent' | 'round_result' | 'finished'
  const [gameState, setGameState] = useState('matching');
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  
  // Local active round variables
  const [pinPosition, setPinPosition] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [streetNames, setStreetNames] = useState([]);
  const [typedGuess, setTypedGuess] = useState('');
  
  // Opponent details cache
  const [opponent, setOpponent] = useState(null);
  const [matchingTime, setMatchingTime] = useState(0);
  const [allowBotTrigger, setAllowBotTrigger] = useState(false);
  const [isBotGame, setIsBotGame] = useState(false);
  const [error, setError] = useState(null);
  const [statsRecorded, setStatsRecorded] = useState(false);
  const [focusedSummaryRound, setFocusedSummaryRound] = useState(null);

  const timerRef = useRef(null);
  const botSimTimeoutRef = useRef(null);

  const isPlayer1 = matchData && matchData.player1.email?.toLowerCase().trim() === user.email?.toLowerCase().trim();
  const currentRound = matchData ? matchData.currentRound : 0;
  const currentRoundAnswers = matchData?.roundAnswers?.[currentRound] || {};
  const myAnswer = isPlayer1 ? currentRoundAnswers.player1 : currentRoundAnswers.player2;
  const oppAnswer = isPlayer1 ? currentRoundAnswers.player2 : currentRoundAnswers.player1;
  const answerControlsDisabled = hasSubmitted || isSubmittingAnswer || !!myAnswer || timeLeft <= 0;

  const handleSetReady = async () => {
    if (!matchId) return;
    const readyField = isPlayer1 ? "player1Ready" : "player2Ready";
    try {
      await updateDoc(doc(db, "matches", matchId), {
        [readyField]: true
      });
    } catch (e) {
      console.error("Error setting ready status:", e);
    }
  };

  // Record online wins/losses once when match is finished
  useEffect(() => {
    if (gameState === 'finished' && matchData && !statsRecorded) {
      setStatsRecorded(true);
      const p1 = matchData.player1;
      const p2 = matchData.player2;

      const myScore = isPlayer1 ? p1.score : p2.score;
      const oppScore = isPlayer1 ? p2.score : p1.score;

      if (myScore > oppScore) {
        user.recordOnlineMatchResult('win');
      } else if (myScore < oppScore) {
        user.recordOnlineMatchResult('loss');
      } else {
        user.recordOnlineMatchResult('draw');
      }
    }
  }, [gameState, matchData, statsRecorded, isPlayer1, user]);

  useEffect(() => {
    appSettings.loadSettings();
  }, []);

  const [allStreets, setAllStreets] = useState([]);

  // Load streets database on mount for local lookup
  useEffect(() => {
    if (gameMode === 'where-is-street' || gameMode === 'what-street') {
      loadStreets().then(setAllStreets);
    }
  }, [gameMode]);

  // Compute active question using local lookup of segments to bypass Firestore nested array limitation
  const activeQuestion = useMemo(() => {
    if (!matchData || !matchData.questions || !matchData.questions[currentRound]) return null;
    const q = matchData.questions[currentRound];
    
    if (gameMode === 'where-is-street' || gameMode === 'what-street') {
      const name = typeof q === 'string' ? q : q.name;
      const found = allStreets.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim());
      return {
        name,
        segments: found ? found.segments : []
      };
    }
    return q;
  }, [matchData, currentRound, gameMode, allStreets]);

  // Load street autocomplete database
  useEffect(() => {
    if (gameMode === 'what-street') {
      loadStreetNames().then(setStreetNames);
    }
  }, [gameMode]);

  // Matchmaking logic
  useEffect(() => {
    if (!user.email) return; // Wait for user details to load
    
    let unsubscribe = null;
    let matchingTimer = setInterval(() => {
      setMatchingTime(prev => {
        if (prev >= 6) {
          setAllowBotTrigger(true);
        }
        return prev + 1;
      });
    }, 1000);

    const startMatchmaking = async () => {
      try {
        setError(null);
        // Query waiting matches for the current mode
        const q = query(
          collection(db, "matches"),
          where("status", "==", "waiting"),
          where("gameMode", "==", gameMode)
        );
        const querySnapshot = await getDocs(q);
        
        let targetMatchDoc = null;
        const myEmail = user.email.toLowerCase().trim();
        // Filter out matches created by the current user
        querySnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const oppEmail = data.player1.email?.toLowerCase().trim();
          if (oppEmail && oppEmail !== myEmail) {
            targetMatchDoc = docSnap;
          }
        });

        if (targetMatchDoc) {
          // Join the waiting match as Player 2
          const matchDocId = targetMatchDoc.id;
          
          const p2Profile = {
            email: user.email,
            name: user.name,
            avatarId: user.avatarId,
            customAvatar: user.customAvatar || null,
            isPremium: user.isPremium || false,
            score: 0,
            rounds: []
          };

          await updateDoc(doc(db, "matches", matchDocId), {
            player2: p2Profile,
            status: "matched",
            player2Ready: false
          });

          setMatchId(matchDocId);
          subscribeToMatch(matchDocId);
        } else {
          // Pre-generate questions for a new match
          let questions = [];
          if (gameMode === 'where-is-street' || gameMode === 'what-street') {
            const randomStreets = await selectRandomStreets(TOTAL_ROUNDS);
            questions = randomStreets.map(s => s.name); // Simple strings to avoid Firestore nested array error
          } else {
            // where-is-place
            const res = await fetch('/data/popular_places.json');
            const data = await res.json();
            const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);
            questions = shuffled.map(p => ({
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              icon: p.icon || 'pin'
            }));
          }

          const p1Profile = {
            email: user.email,
            name: user.name,
            avatarId: user.avatarId,
            customAvatar: user.customAvatar || null,
            isPremium: user.isPremium || false,
            score: 0,
            rounds: []
          };

          const newMatch = {
            gameMode,
            status: 'waiting',
            player1: p1Profile,
            player2: null,
            currentRound: 0,
            roundAnswers: {},
            questions,
            player1Ready: false,
            player2Ready: false,
            player1NextRoundReady: false,
            player2NextRoundReady: false,
            createdAt: new Date().toISOString()
          };

          const docRef = await addDoc(collection(db, "matches"), newMatch);
          setMatchId(docRef.id);
          subscribeToMatch(docRef.id);
        }
      } catch (err) {
        console.error("Matchmaking error:", err);
        setError(err.message || String(err));
      }
    };

    const subscribeToMatch = (id) => {
      unsubscribe = onSnapshot(doc(db, "matches", id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMatchData(data);
          
          // Identify opponent
          const userEmail = user.email?.toLowerCase().trim();
          if (data.player1.email?.toLowerCase().trim() === userEmail) {
            setOpponent(data.player2);
          } else {
            setOpponent(data.player1);
          }

          if (data.status === 'playing') {
            setGameState('playing');
            clearInterval(matchingTimer);
          } else if (data.status === 'matched') {
            setGameState('matched');
            clearInterval(matchingTimer);
            
            // Auto start if both ready
            if (data.player1Ready && data.player2Ready) {
              updateDoc(doc(db, "matches", id), {
                status: 'playing'
              });
            }
          } else if (data.status === 'finished') {
            setGameState('finished');
          }
        }
      }, (err) => {
        console.error("Subscription error:", err);
        setError(err.message || String(err));
      });
    };

    startMatchmaking();

    return () => {
      clearInterval(matchingTimer);
      if (unsubscribe) unsubscribe();
      if (botSimTimeoutRef.current) clearTimeout(botSimTimeoutRef.current);
    };
  }, [gameMode, user.email, user.name, user.avatarId, user.isPremium, user.customAvatar]);

  // Handle Match status transitions and countdown timers
  useEffect(() => {
    if (!matchData || (gameState !== 'playing' && gameState !== 'waiting_opponent' && gameState !== 'round_result')) return;

    const roundIndex = matchData.currentRound;
    const answers = matchData.roundAnswers?.[roundIndex] || {};

    // Check if both players have submitted answers for the current round
    const hasP1Answered = !!answers.player1;
    const hasP2Answered = !!answers.player2;
    const myNextReady = isPlayer1 ? !!matchData.player1NextRoundReady : !!matchData.player2NextRoundReady;
    const otherNextReady = isPlayer1 ? !!matchData.player2NextRoundReady : !!matchData.player1NextRoundReady;

    if (hasP1Answered && hasP2Answered) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (myNextReady && !otherNextReady) {
        setGameState('waiting_opponent');
      } else if (!myNextReady || !otherNextReady) {
        // Both submitted! Transition to round result view
        setGameState('round_result');
      }
    } else if (gameState !== 'round_result') {
      // Game is still in active thinking phase
      const myAnswer = isPlayer1 ? answers.player1 : answers.player2;
      if (myAnswer) {
        setGameState('waiting_opponent');
      } else {
        setGameState('playing');
      }
    }
  }, [matchData, gameState, isPlayer1]);

  // Advance to the next round when both players clicked "Następna runda".
  useEffect(() => {
    if (!matchId || !matchData || gameState !== 'waiting_opponent') return;
    if (!matchData.player1NextRoundReady || !matchData.player2NextRoundReady) return;

    const nextRoundIndex = matchData.currentRound + 1;
    if (nextRoundIndex >= TOTAL_ROUNDS) return;

    updateDoc(doc(db, "matches", matchId), {
      currentRound: nextRoundIndex,
      player1NextRoundReady: false,
      player2NextRoundReady: false
    }).catch((e) => console.error("Error advancing round:", e));
  }, [matchId, matchData, gameState]);

  // Round local timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    setTimeLeft(ROUND_DURATION);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentRound]);

  // Reset local answer controls whenever Firestore moves the match to a fresh round.
  useEffect(() => {
    setHasSubmitted(false);
    setIsSubmittingAnswer(false);
    setPinPosition(null);
    setTypedGuess('');
  }, [currentRound]);

  // Opponent Bot Simulation trigger
  useEffect(() => {
    if (gameState !== 'waiting_opponent' || !matchData || !opponent?.isBot) return;

    // Simulate bot thinking time before submitting answer
    botSimTimeoutRef.current = setTimeout(() => {
      simulateBotMove();
    }, 1200);

    return () => {
      if (botSimTimeoutRef.current) clearTimeout(botSimTimeoutRef.current);
    };
  }, [gameState, currentRound, matchData, opponent]);

  // Matchmaking cancel
  const handleCancelMatchmaking = async () => {
    if (matchId && matchData && matchData.status === 'waiting') {
      try {
        await updateDoc(doc(db, "matches", matchId), {
          status: 'cancelled'
        });
      } catch (e) {
        console.warn(e);
      }
    }
    navigate('/');
  };

  // Convert matchmaking to a simulated bot game
  const handleAddBotOpponent = async () => {
    if (!matchId) return;
    setIsBotGame(true);
    const botProfile = {
      email: 'wirtualny_kierowca@bolters.pl',
      name: 'Kierowca Jan',
      avatarId: 'auris',
      isPremium: true,
      isBot: true,
      score: 0,
      rounds: []
    };

    try {
      await updateDoc(doc(db, "matches", matchId), {
        player2: botProfile,
        status: 'matched',
        player2Ready: true
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTimeout = () => {
    if (isSubmittingAnswer || myAnswer) return;
    submitAnswer(null, true);
  };

  // Bot response simulation in Firestore match document
  const simulateBotMove = async () => {
    const roundIndex = matchData.currentRound;
    const answers = matchData.roundAnswers?.[roundIndex] || {};
    if (answers.player2) return; // bot already answered

    let score = 0;
    let distance = 0;
    let guessCoords = null;
    let guessText = '';

    if (gameMode === 'where-is-street') {
      const botRes = generateBotRound();
      score = botRes.score;
      distance = botRes.distance;
      const targetPoint = activeQuestion.segments[0]?.[0] || LEGNICA_CENTER;
      guessCoords = generateBotCoordinates(targetPoint, distance);
    } else if (gameMode === 'where-is-place') {
      const botRes = generateBotRound();
      score = botRes.score;
      distance = botRes.distance;
      const targetPoint = [activeQuestion.lat, activeQuestion.lng];
      guessCoords = generateBotCoordinates(targetPoint, distance);
    } else {
      // what-street
      const botRes = generateBotStreetGuess(activeQuestion.name, streetNames);
      score = botRes.score;
      guessText = botRes.guess;
    }

    const newBotRounds = [...(matchData.player2.rounds || []), { score, distance, guess: guessText }];
    const newBotScore = matchData.player2.score + score;

    await updateDoc(doc(db, "matches", matchId), {
      [`roundAnswers.${roundIndex}.player2`]: { score, distance, pinPosition: guessCoords, guessText },
      "player2.score": newBotScore,
      "player2.rounds": newBotRounds
    });
  };

  // Submit local user guess
  const submitAnswer = async (selection = null, timedOut = false, textGuessOverride = null) => {
    if (isSubmittingAnswer || myAnswer) return;
    setHasSubmitted(true);
    setIsSubmittingAnswer(true);

    let score = 0;
    let distance = 0;
    let submissionPosition = selection || pinPosition;
    const answerText = textGuessOverride ?? typedGuess;

    if (gameMode === 'where-is-street') {
      if (submissionPosition && !timedOut) {
        const result = distanceToStreet(submissionPosition, activeQuestion.segments);
        distance = result.distance;
        score = calculateScore(distance);
      }
    } else if (gameMode === 'where-is-place') {
      if (submissionPosition && !timedOut) {
        const target = [activeQuestion.lat, activeQuestion.lng];
        const result = distanceToPoint(submissionPosition, target);
        distance = result.distance;
        score = calculatePlaceScore(distance);
      }
    } else {
      // what-street
      if (normalizeStreetName(answerText) === normalizeStreetName(activeQuestion.name) && !timedOut) {
        score = 100;
      }
    }

    const roundIndex = matchData.currentRound;
    const playerKey = isPlayer1 ? "player1" : "player2";
    
    const userRoundResult = {
      score: Number(score) || 0,
      distance: submissionPosition ? Number(distance) || 0 : null,
      pinPosition: submissionPosition || null,
      guessText: answerText || '',
      timedOut: !!timedOut
    };

    const myProfileData = isPlayer1 ? matchData.player1 : matchData.player2;
    const updatedRounds = [...(myProfileData.rounds || []), userRoundResult];
    const updatedScore = (myProfileData.score || 0) + userRoundResult.score;

    try {
      await updateDoc(doc(db, "matches", matchId), {
        [`roundAnswers.${roundIndex}.${playerKey}`]: userRoundResult,
        [`${playerKey}.score`]: updatedScore,
        [`${playerKey}.rounds`]: updatedRounds
      });
    } catch (e) {
      console.error("Error submitting multiplayer answer:", e);
      setHasSubmitted(false);
      setError(e.message || String(e));
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Navigate rounds synchronously in Firestore
  const handleNextRound = async () => {
    setHasSubmitted(false);
    setIsSubmittingAnswer(false);
    setPinPosition(null);
    setTypedGuess('');

    const nextRoundIndex = currentRound + 1;
    
    if (nextRoundIndex >= TOTAL_ROUNDS) {
      // End game
      await updateDoc(doc(db, "matches", matchId), {
        status: 'finished'
      });
      return;
    }

    const readyField = isPlayer1 ? "player1NextRoundReady" : "player2NextRoundReady";
    const otherReadyField = isPlayer1 ? "player2NextRoundReady" : "player1NextRoundReady";

    // Set self as ready
    await updateDoc(doc(db, "matches", matchId), {
      [readyField]: true
    });

    // Check if other player is already ready (or is Bot)
    if (matchData[otherReadyField] || opponent?.isBot) {
      // Both ready! Advance round number
      await updateDoc(doc(db, "matches", matchId), {
        currentRound: nextRoundIndex,
        player1NextRoundReady: false,
        player2NextRoundReady: false
      });
      setGameState('playing');
    } else {
      setGameState('waiting_opponent');
    }
  };

  // Matchmaking / Ready Lobby JSX
  if (gameState === 'matching' || gameState === 'matched') {
    const selfAvatar = AVATARS.find(a => a.id === user.avatarId) || AVATARS[0];
    const isMatched = gameState === 'matched' && opponent;
    
    // Check local readiness
    const amIReady = isPlayer1 ? matchData?.player1Ready : matchData?.player2Ready;
    const isOpponentReady = isPlayer1 ? matchData?.player2Ready : matchData?.player1Ready;

    const oppAvatarObj = opponent 
      ? (opponent.avatarId === 'custom' && opponent.customAvatar 
        ? { image: opponent.customAvatar, bg: 'transparent' }
        : (AVATARS.find(a => a.id === opponent.avatarId) || AVATARS[0]))
      : AVATARS[0];

    return (
      <div className="lobby-container animate-fade-in">
        <div className="lobby-glow" />
        
        <header className="lobby-header">
          <span className="lobby-badge">RYWALIZACJA MULTIPLAYER</span>
          <h1 className="lobby-title text-display">
            {isMatched ? 'PRZECIWNIK ZNALEZIONY!' : 'SZUKANIE PRZECIWNIKA'}
          </h1>
          <p className="lobby-desc">
            {isMatched ? 'Potwierdź gotowość do rozpoczęcia pojedynku.' : 'Kojarzenie kierowców do pojedynku 1v1 w trybie:'}
          </p>
          <div className="lobby-mode-name">
            {gameMode === 'where-is-street' && 'Gdzie jest ta ulica?'}
            {gameMode === 'where-is-place' && 'Gdzie jest to miejsce?'}
            {gameMode === 'what-street' && 'Co to za ulica?'}
          </div>
        </header>

        {isMatched ? (
          /* Ready check VS display */
          <div className="lobby-vs-wrapper glass-card animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', width: '100%', maxWidth: '420px', margin: '20px 0', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
              {/* Self */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '120px' }}>
                <div 
                  className={`radar-center-avatar ${user.isPremium ? 'premium-glow-avatar' : ''}`}
                  style={{ backgroundColor: selfAvatar.bg, width: '72px', height: '72px' }}
                >
                  {user.customAvatar ? (
                    <img src={user.customAvatar} alt="Ty" />
                  ) : (
                    selfAvatar.image ? <img src={selfAvatar.image} alt="Ty" /> : selfAvatar.emoji
                  )}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {user.name} (Ty)
                </div>
                <span 
                  className="lobby-badge"
                  style={{ 
                    background: amIReady ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                    color: amIReady ? 'var(--green-primary)' : '#FF9800',
                    border: amIReady ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 152, 0, 0.2)'
                  }}
                >
                  {amIReady ? 'GOTÓW' : 'OCZEKIWANIE'}
                </span>
              </div>

              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-tertiary)' }}>VS</div>

              {/* Opponent */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '120px' }}>
                <div 
                  className={`radar-center-avatar ${opponent?.isPremium ? 'premium-glow-avatar' : ''}`}
                  style={{ backgroundColor: oppAvatarObj.bg, width: '72px', height: '72px' }}
                >
                  {opponent?.customAvatar ? (
                    <img src={opponent.customAvatar} alt={opponent?.name} />
                  ) : (
                    oppAvatarObj.image ? <img src={oppAvatarObj.image} alt={opponent?.name} /> : oppAvatarObj.emoji
                  )}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {opponent?.name}
                </div>
                <span 
                  className="lobby-badge"
                  style={{ 
                    background: isOpponentReady ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                    color: isOpponentReady ? 'var(--green-primary)' : '#FF9800',
                    border: isOpponentReady ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 152, 0, 0.2)'
                  }}
                >
                  {isOpponentReady ? 'GOTÓW' : 'OCZEKIWANIE'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Radar scanning */
          <div className="lobby-radar-wrapper">
            <div className="radar-circle">
              <div className="radar-sweep" />
              <div 
                className={`radar-center-avatar ${user.isPremium ? 'premium-glow-avatar' : ''}`}
                style={{ backgroundColor: selfAvatar.bg }}
              >
                {user.customAvatar ? (
                  <img src={user.customAvatar} alt="Ty" />
                ) : (
                  selfAvatar.image ? <img src={selfAvatar.image} alt="Ty" /> : selfAvatar.emoji
                )}
              </div>
            </div>
          </div>
        )}

        <div className="lobby-status">
          {error ? (
            <p className="lobby-status-text" style={{ color: '#F44336', fontWeight: 'bold', fontSize: '0.85rem' }}>
              Błąd połączenia: {error}
            </p>
          ) : isMatched ? (
            <p className="lobby-status-text animate-pulse" style={{ color: 'var(--green-primary)', fontWeight: 'bold' }}>
              Obaj gracze muszą potwierdzić gotowość...
            </p>
          ) : (
            <>
              <p className="lobby-status-text animate-pulse">Łączenie z satelitą Legnicy...</p>
              <span className="lobby-timer">Czas: {matchingTime}s</span>
            </>
          )}
        </div>

        <div className="lobby-actions" style={{ maxWidth: '320px', width: '100%' }}>
          {isMatched ? (
            <button 
              className="btn-primary start-btn" 
              onClick={handleSetReady}
              disabled={amIReady}
              style={{ width: '100%', height: '48px', fontSize: '1rem', background: amIReady ? '#475569' : '' }}
            >
              {amIReady ? 'Czekanie na drugiego gracza...' : 'JESTEM GOTOWY'}
            </button>
          ) : (
            allowBotTrigger && (
              <button className="btn-primary animate-fade-in-up" onClick={handleAddBotOpponent} style={{ width: '100%' }}>
                Zagraj z wirtualnym kierowcą
              </button>
            )
          )}
          <button className="btn-secondary cancel-lobby-btn" onClick={handleCancelMatchmaking} style={{ width: '100%', marginTop: isMatched ? '10px' : '0' }}>
            {isMatched ? 'Opuść pokój' : 'Anuluj szukanie'}
          </button>
        </div>
      </div>
    );
  }

  // Summary result at game end JSX
  if (gameState === 'finished' && matchData) {
    const p1 = matchData.player1;
    const p2 = matchData.player2;

    const myScore = isPlayer1 ? p1.score : p2.score;
    const oppScore = isPlayer1 ? p2.score : p1.score;

    const playerWon = myScore > oppScore;
    const isDraw = myScore === oppScore;

    const p1Avatar = p1.avatarId === 'custom' && p1.customAvatar
      ? { image: p1.customAvatar, bg: 'transparent' }
      : (AVATARS.find(a => a.id === p1.avatarId) || AVATARS[0]);

    const p2Avatar = p2.avatarId === 'custom' && p2.customAvatar
      ? { image: p2.customAvatar, bg: 'transparent' }
      : (AVATARS.find(a => a.id === p2.avatarId) || AVATARS[0]);

    const summaryMapItems = matchData.questions
      .map((quest, idx) => {
        const questionName = typeof quest === 'string' ? quest : quest.name;
        const color = SUMMARY_ROUTE_COLORS[idx % SUMMARY_ROUTE_COLORS.length];
        const myRound = isPlayer1 ? p1.rounds?.[idx] : p2.rounds?.[idx];
        const opponentRound = isPlayer1 ? p2.rounds?.[idx] : p1.rounds?.[idx];
        const roundOutcome = getRoundOutcomeStatus(myRound?.score || 0, opponentRound?.score || 0);

        if (gameMode === 'where-is-street') {
          const street = allStreets.find(s => normalizeStreetName(s.name) === normalizeStreetName(questionName));
          if (!street?.segments?.length) return null;
          return {
            round: idx + 1,
            name: questionName,
            color,
            ...roundOutcome,
            segments: street.segments,
            labelPosition: getSummaryLabelPosition(street.segments)
          };
        }

        if (gameMode === 'where-is-place' && Number.isFinite(quest.lat) && Number.isFinite(quest.lng)) {
          const position = [quest.lat, quest.lng];
          return {
            round: idx + 1,
            name: questionName,
            color,
            ...roundOutcome,
            segments: [],
            labelPosition: position
          };
        }

        return null;
      })
      .filter(Boolean);
    const summaryMapBounds = getSummaryMapBounds(summaryMapItems);
    const showSummaryMap = appSettings.summaryMapEnabled && (gameMode === 'where-is-street' || gameMode === 'where-is-place') && summaryMapItems.length > 0;

    return (
      <div className="mp-summary-page animate-fade-in">
        <div className="mp-summary-glow" />

        <div className="mp-summary-content">
          <header className="mp-summary-header">
            <h1 className="mp-verdict-title text-display">
              {isDraw ? 'REMIS!' : playerWon ? 'WYGRANA!' : 'PRZEGRANA!'}
            </h1>
            <p className="mp-verdict-desc">
              {isDraw 
                ? 'Niesamowite! Obaj kierowcy znają Legnicę na tym samym poziomie.' 
                : playerWon 
                  ? 'Gratulacje! Pokazałeś, kto rządzi na Legnickich ulicach.' 
                  : 'Niestety, tym razem przeciwnik był szybszy lub dokładniejszy.'}
            </p>
          </header>

          {/* Versus Header */}
          <div className="mp-vs-header glass-card">
            <div className="mp-vs-card mp-vs-card--player">
              <div 
                className={`mp-vs-avatar ${p1.isPremium ? 'premium-glow-avatar' : ''}`}
                style={{ backgroundColor: p1Avatar.bg }}
              >
                {p1.customAvatar ? (
                  <img src={p1.customAvatar} alt={p1.name} />
                ) : (
                  p1Avatar.image ? <img src={p1Avatar.image} alt={p1.name} /> : p1Avatar.emoji
                )}
              </div>
              <div className="mp-vs-name">{p1.name}</div>
              <div className="mp-vs-score">{p1.score}</div>
            </div>

            <div className="mp-vs-divider">VS</div>

            <div className="mp-vs-card mp-vs-card--opponent">
              <div 
                className={`mp-vs-avatar ${p2.isPremium ? 'premium-glow-avatar' : ''}`}
                style={{ backgroundColor: p2Avatar.bg }}
              >
                {p2.customAvatar ? (
                  <img src={p2.customAvatar} alt={p2.name} />
                ) : (
                  p2Avatar.image ? <img src={p2Avatar.image} alt={p2.name} /> : p2Avatar.emoji
                )}
              </div>
              <div className="mp-vs-name">{p2.name}</div>
              <div className="mp-vs-score">{p2.score}</div>
            </div>
          </div>

          {showSummaryMap && (
            <div className="mp-summary-map glass-card">
              <div className="mp-summary-map__header">
                <h3 className="mp-breakdown-title">Mapa rozegranych rund</h3>
              </div>
              <div className="mp-summary-map__canvas">
                <GameMap
                  disabled
                  enableZoom={false}
                  summaryRounds={summaryMapItems}
                  focusedSummaryRound={focusedSummaryRound}
                  fitBounds={summaryMapBounds}
                  paddingOptions={{ padding: [34, 34], maxZoom: 15, animate: false }}
                  roundKey={`summary-${matchId}-${summaryMapItems.length}`}
                />
              </div>
            </div>
          )}

          {/* Round breakdown details */}
          <div className="mp-rounds-breakdown glass-card">
            <h3 className="mp-breakdown-title">Podsumowanie rund</h3>
            
            {matchData.questions.map((quest, idx) => {
              const p1Round = p1.rounds?.[idx] || { score: 0 };
              const p2Round = p2.rounds?.[idx] || { score: 0 };
              const questionName = typeof quest === 'string' ? quest : quest.name;
              
              const isP1Closer = (p1Round.score || 0) > (p2Round.score || 0);
              const isP2Closer = (p2Round.score || 0) > (p1Round.score || 0);
              const isFocusedRound = focusedSummaryRound === idx + 1;

              return (
                <div
                  key={idx}
                  className={`mp-round-row ${isFocusedRound ? 'mp-round-row--focused' : ''}`}
                  tabIndex={showSummaryMap ? 0 : undefined}
                  onMouseEnter={() => showSummaryMap && setFocusedSummaryRound(idx + 1)}
                  onFocus={() => showSummaryMap && setFocusedSummaryRound(idx + 1)}
                  onClick={() => showSummaryMap && setFocusedSummaryRound(idx + 1)}
                >
                  <div className="mp-round-index" style={{ width: '24px' }}>{idx + 1}.</div>
                  <div className="mp-round-question-name">{questionName}</div>
                  
                  <div className="mp-round-scores-comparison">
                    <span className={`mp-round-p1-score ${isP1Closer ? 'winner-text' : ''}`}>
                      {p1Round.score} pkt {typeof p1Round.distance === 'number' && `(${Math.round(p1Round.distance)}m)`}
                    </span>
                    <span className="scores-divider">•</span>
                    <span className={`mp-round-p2-score ${isP2Closer ? 'winner-text' : ''}`}>
                      {p2Round.score} pkt {typeof p2Round.distance === 'number' && `(${Math.round(p2Round.distance)}m)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mp-summary-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              Wróć do Menu głównego
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active sync gameplay phase
  const targetStreetSegments = gameMode === 'where-is-place' ? null : activeQuestion?.segments;
  const closestPoint = (gameState === 'round_result' || gameState === 'waiting_opponent') && activeQuestion
    ? (gameMode === 'where-is-place' 
      ? [activeQuestion.lat, activeQuestion.lng]
      : (pinPosition && activeQuestion.segments ? distanceToStreet(pinPosition, activeQuestion.segments).closestPoint : null))
    : null;

  const showResultOnMap = gameState === 'round_result';
  const isRoundDraw = myAnswer && oppAnswer && myAnswer.score === oppAnswer.score;

  const selfAvatar = AVATARS.find(a => a.id === user.avatarId) || AVATARS[0];
  const oppAvatar = opponent 
    ? (opponent.avatarId === 'custom' && opponent.customAvatar 
      ? { image: opponent.customAvatar, bg: 'transparent' }
      : (AVATARS.find(a => a.id === opponent.avatarId) || AVATARS[0]))
    : AVATARS[0];

  const mapBounds = showResultOnMap 
    ? (gameMode === 'where-is-place' 
      ? getPointsCombinedBounds([pinPosition || LEGNICA_CENTER, closestPoint || LEGNICA_CENTER, oppAnswer?.pinPosition || LEGNICA_CENTER]) 
      : getCombinedBounds(activeQuestion?.segments, pinPosition, closestPoint))
    : (gameMode === 'what-street' && activeQuestion?.segments
      ? getStreetBounds(activeQuestion.segments) 
      : null);

  const handleAutocompleteSubmit = (streetName) => {
    setTypedGuess(streetName);
    submitAnswer(null, false, streetName);
  };

  const handleConfirmClick = () => {
    if (!pinPosition) return;
    submitAnswer(pinPosition, false);
  };

  return (
    <div className="game-page">
      {/* Real-time sync map */}
      <GameMap
        onMapClick={setPinPosition}
        pinPosition={pinPosition}
        streetSegments={gameMode === 'what-street' || showResultOnMap ? targetStreetSegments : null}
        showStreet={gameMode === 'what-street' || showResultOnMap}
        closestPoint={closestPoint}
        disabled={answerControlsDisabled}
        roundKey={currentRound}
        fitBounds={mapBounds}
        paddingOptions={showResultOnMap ? { paddingTopLeft: [40, 90], paddingBottomRight: [40, 320], maxZoom: 16, animate: true, duration: 0.8 } : null}
        
        playerAvatar={user.customAvatar ? 'U' : selfAvatar.emoji}
        playerAvatarImg={user.customAvatar || selfAvatar.image}
        playerBg={selfAvatar.bg}
        playerRoundScore={myAnswer?.score}
        playerRoundDistance={myAnswer?.distance}
        playerIsPremium={user.isPremium}

        botPinPosition={oppAnswer?.pinPosition}
        botRoundScore={oppAnswer?.score}
        botRoundDistance={oppAnswer?.distance}
        opponentName={opponent?.name || 'Przeciwnik'}
        opponentAvatar={opponent?.customAvatar ? 'U' : oppAvatar.emoji}
        opponentAvatarImg={opponent?.customAvatar || oppAvatar.image}
        opponentBg={oppAvatar.bg}
        opponentIsPremium={opponent?.isPremium || false}
        showResultDetails={showResultOnMap}
      />

      {/* Unified HUD */}
      <GameHUD
        playerName={user.name}
        playerAvatar={user.customAvatar ? <img src={user.customAvatar} alt="Ja" /> : (selfAvatar.image ? <img src={selfAvatar.image} alt="Ja" /> : selfAvatar.emoji)}
        playerBg={selfAvatar.bg}
        playerScore={isPlayer1 ? (matchData?.player1?.score || 0) : (matchData?.player2?.score || 0)}
        playerRoundPoints={myAnswer?.score}
        playerIsPremium={user.isPremium}

        opponentName={opponent?.name || 'Przeciwnik'}
        opponentAvatar={opponent?.customAvatar ? <img src={opponent.customAvatar} alt={opponent.name} /> : (oppAvatar.image ? <img src={oppAvatar.image} alt={opponent.name} /> : oppAvatar.emoji)}
        opponentBg={oppAvatar.bg}
        opponentScore={isPlayer1 ? (matchData?.player2?.score || 0) : (matchData?.player1?.score || 0)}
        opponentRoundPoints={oppAnswer?.score}
        opponentIsPremium={opponent?.isPremium || false}

        timeLeft={timeLeft}
        progress={timeLeft / ROUND_DURATION}
        isRunning={gameState === 'playing'}
        
        currentRound={currentRound + 1}
        totalRounds={TOTAL_ROUNDS}
        isTraining={false}
        isChallenge={false}
        isShowingResult={showResultOnMap}
        onBackClick={() => {
          if (window.confirm('Czy na pewno chcesz opuścić pojedynek? Stracisz dotychczasowe punkty.')) {
            navigate('/');
          }
        }}
      />

      {/* Bottom control bar */}
      <div 
        className="hud-bottom-bar"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="hud-bottom-bar__info">
          {gameState === 'playing' && (
            <>
              <div className="hud-bottom-bar__round">Pojedynek 1v1</div>
              <div className="hud-bottom-bar__target">
                {gameMode === 'where-is-street' && `ZNAJDŹ ULICĘ: ${activeQuestion?.name?.toUpperCase() || ''}`}
                {gameMode === 'where-is-place' && `ZNAJDŹ MIEJSCE: ${activeQuestion?.name?.toUpperCase() || ''}`}
                {gameMode === 'what-street' && 'JAKA TO ULICA? WPISZ NAZWĘ PONIŻEJ'}
              </div>
              {gameMode === 'what-street' && (
                <StreetAutocomplete
                  streetNames={streetNames}
                  onSubmit={handleAutocompleteSubmit}
                  disabled={answerControlsDisabled}
                  requireValidSelection={false}
                />
              )}
            </>
          )}

          {gameState === 'waiting_opponent' && (
            <>
              <div className="hud-bottom-bar__round" style={{ color: 'var(--green-primary)' }}>Ruch zapisany! ✓</div>
              <div className="hud-bottom-bar__target animate-pulse" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Oczekiwanie na ruch przeciwnika...
              </div>
            </>
          )}

          {gameState === 'round_result' && (
            <>
              <div className="hud-bottom-bar__round" style={{ color: (myAnswer?.score || 0) > (oppAnswer?.score || 0) ? 'var(--green-primary)' : 'var(--text-secondary)' }}>
                {isRoundDraw ? 'Runda remisowa!' : (myAnswer?.score || 0) > (oppAnswer?.score || 0) ? 'Wygrywasz tę rundę!' : 'Przeciwnik był lepszy w tej rundzie!'}
              </div>
              <div className="hud-bottom-bar__target">
                {gameMode === 'what-street' 
                  ? `To ulica: ${activeQuestion?.name?.toUpperCase() || ''}`
                  : `Cel: ${activeQuestion?.name?.toUpperCase() || ''}`}
              </div>
              <div className="hud-bottom-bar__details" style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>Ty: <strong style={{ color: 'var(--green-primary)' }}>+{myAnswer?.score} pkt</strong> {typeof myAnswer?.distance === 'number' && `(${Math.round(myAnswer.distance)}m)`}</span>
                <span>{opponent?.name || 'Przeciwnik'}: <strong style={{ color: '#FF9800' }}>+{oppAnswer?.score} pkt</strong> {typeof oppAnswer?.distance === 'number' && `(${Math.round(oppAnswer.distance)}m)`}</span>
              </div>
            </>
          )}
        </div>

        <div className="hud-bottom-action">
          {gameState === 'playing' && gameMode !== 'what-street' && pinPosition && (
            <button className="btn-primary btn-confirm" onClick={handleConfirmClick}>
              Zatwierdź cel
            </button>
          )}
          {gameState === 'round_result' && (
            <button className="btn-primary btn-next" onClick={handleNextRound}>
              {currentRound + 1 >= TOTAL_ROUNDS ? 'Wyniki meczu' : 'Następna runda'}
            </button>
          )}
        </div>

        <div className="hud-bottom-bar__footer">Spotastreet 1v1 Multiplayer w Czasie Rzeczywistym</div>
      </div>
    </div>
  );
}

export default Multiplayer;
