import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import { fetchAllCloudProfiles } from '../config/firebase';
import { AVATARS } from '../data/avatars';
import { maskEmail } from '../utils/privacy';
import './QuizSummary.css';

/**
 * Full-screen quiz summary with animated score reveal and round breakdown
 */
function QuizSummary({
  playerScore,
  botScore,
  playerRounds = [],
  botRounds = [],
  totalRounds = 10,
  gameMode,
  streets,
  places,
  isTraining,
  challengeId,
  onPlayAgain,
  onExit,
}) {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const hasRecordedStatsRef = useRef(false);
  const safePlayerScore = Number(playerScore) || 0;
  const safeBotScore = Number(botScore) || 0;
  const safePlayerRounds = Array.isArray(playerRounds) ? playerRounds : [];
  const safeBotRounds = Array.isArray(botRounds) ? botRounds : [];
  const safeTotalRounds = Number(totalRounds) || 1;
  const playedRoundsCount = Math.max(1, safePlayerRounds.length || safeTotalRounds);
  const maxScore = playedRoundsCount * 100;
  const animatedScoreRatio = maxScore > 0 ? Math.min(1, animatedScore / maxScore) : 0;
  const playerWon = safePlayerScore > safeBotScore;
  const isDraw = safePlayerScore === safeBotScore;

  useEffect(() => {
    if (!Array.isArray(playerRounds) || !Array.isArray(botRounds)) {
      console.warn('QuizSummary received incomplete round data; using safe fallbacks.');
    }
  }, [playerRounds, botRounds]);

  const recordSummaryStats = () => {
    if (!user.isLoggedIn) return;
    if (hasRecordedStatsRef.current) return;
    hasRecordedStatsRef.current = true;

    try {
      if (challengeId) {
        user.recordChallengeAttempt(challengeId, safePlayerScore);
      } else if (!isTraining && gameMode) {
        user.recordGameResult(gameMode, safePlayerScore > safeBotScore);
      }
    } catch (err) {
      console.warn('Could not persist game summary stats; showing local summary only.', err);
    }
  };

  // Challenge scores are needed immediately for the challenge leaderboard.
  useEffect(() => {
    if (challengeId) recordSummaryStats();
  }, []);

  // Fetch leaderboard for challenge
  useEffect(() => {
    if (challengeId) {
      const loadChallengeRankings = async () => {
        setLoadingLeaderboard(true);
        try {
          const profiles = await fetchAllCloudProfiles();
          if (profiles) {
            const ranks = [];
            profiles.forEach(p => {
              const attempts = p.challengeAttempts || {};
              const scoreForChallenge = attempts[challengeId];
              if (scoreForChallenge !== undefined) {
                ranks.push({
                  name: p.name || 'Kierowca',
                  email: p.email,
                  avatarId: p.avatarId,
                  score: scoreForChallenge,
                  hideEmail: p.hideEmail || false,
                  isPremium: p.isPremium || false,
                  customAvatar: p.customAvatar || null
                });
              }
            });
            ranks.sort((a, b) => b.score - a.score);
            setChallengeLeaderboard(ranks.slice(0, 10));
          }
        } catch (err) {
          console.warn('Could not load challenge leaderboard; showing local summary only.', err);
        } finally {
          setLoadingLeaderboard(false);
        }
      };
      loadChallengeRankings();
    }
  }, [challengeId]);


  // Animate score counting up
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = safePlayerScore / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(safePlayerScore, Math.round(increment * step));
      setAnimatedScore(current);

      if (step >= steps) {
        clearInterval(interval);
        setAnimatedScore(safePlayerScore);
        setTimeout(() => setShowDetails(true), 300);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [safePlayerScore]);

  // Confetti for great scores
  const showConfetti = safePlayerScore >= 800;

  const getVerdict = () => {
    if (isDraw) return { text: 'Remis!', icon: 'target', color: '#FFEB3B' };
    if (playerWon) return { text: 'Wygrywasz!', icon: 'trophy', color: '#00E676' };
    return { text: 'Bot wygrywa!', icon: 'alert', color: '#F44336' };
  };

  const verdict = getVerdict();

  const getTitle = () => {
    if (safePlayerScore >= 900) return 'Legenda Legnicy!';
    if (safePlayerScore >= 700) return 'Znawca miasta!';
    if (safePlayerScore >= 500) return 'Całkiem nieźle!';
    if (safePlayerScore >= 300) return 'Dobry początek';
    return 'Jest nad czym pracować';
  };

  const handlePlayAgain = () => {
    recordSummaryStats();
    if (onPlayAgain) {
      onPlayAgain();
      return;
    }
    window.location.reload();
  };

  const handleExit = () => {
    recordSummaryStats();
    if (onExit) {
      onExit();
      return;
    }
    navigate('/');
  };

  return (
    <div className="quiz-summary">
      {/* Confetti */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: ['#00E676', '#FFEB3B', '#42A5F5', '#FF9800', '#E040FB'][i % 5],
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="quiz-summary__content">
        {/* Title */}
        <h2 className="quiz-summary__title text-display animate-fade-in-up">
          {getTitle()}
        </h2>

        {/* Score Circle */}
        <div className="quiz-summary__score-circle animate-scale-in">
          <svg className="quiz-summary__ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="var(--green-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - animatedScoreRatio)}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            />
          </svg>
          <div className="quiz-summary__score-inner">
            <span className="quiz-summary__score-value">{animatedScore}</span>
            <span className="quiz-summary__score-max">/ {maxScore}</span>
          </div>
        </div>

        {/* Verdict (only for bot matches) */}
        {!challengeId && (
          <div className="quiz-summary__verdict animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <span className={`quiz-summary__verdict-emoji line-icon line-icon--${verdict.icon}`} aria-hidden="true" />
            <span className="quiz-summary__verdict-text" style={{ color: verdict.color }}>{verdict.text}</span>
          </div>
        )}

        {/* Score comparison (only for bot matches) */}
        {!challengeId && (
          <div className="quiz-summary__comparison animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className={`quiz-summary__player ${playerWon ? 'quiz-summary__player--winner' : ''}`}>
              <span className="quiz-summary__player-label">Ty</span>
              <span className="quiz-summary__player-score">{safePlayerScore}</span>
            </div>
            <div className="quiz-summary__vs">vs</div>
            <div className={`quiz-summary__player ${!playerWon && !isDraw ? 'quiz-summary__player--winner' : ''}`}>
              <span className="quiz-summary__player-label">Bot</span>
              <span className="quiz-summary__player-score">{safeBotScore}</span>
            </div>
          </div>
        )}

        {/* Round Breakdown */}
        {showDetails && (
          <div className="quiz-summary__rounds animate-fade-in-up">
            <h3 className="quiz-summary__rounds-title">Szczegóły rund</h3>
            {safePlayerRounds.length === 0 ? (
              <div className="quiz-summary__empty">Brak zapisanych rund dla tej gry.</div>
            ) : safePlayerRounds.map((round, i) => {
              const safeRound = round || {};
              const safeBotRound = safeBotRounds[i] || null;
              const pScore = gameMode === 'what-street'
                ? (safeRound.correct ? 100 : 0)
                : (safeRound.score !== undefined ? Number(safeRound.score) || 0 : 0);
              const isError = pScore === 0;

              return (
                <div key={i} className="quiz-summary__round-row">
                  <span className="quiz-summary__round-num">{i + 1}</span>
                  <span className="quiz-summary__round-street-name">
                    {streets?.[i]?.name || places?.[i]?.name || `Cel ${i + 1}`}
                  </span>
                  <span className={`quiz-summary__round-player ${isError ? 'quiz-summary__round-player--error' : ''}`}>
                    {gameMode === 'what-street'
                      ? (safeRound.correct ? '✓ 100 pkt' : '✗ 0 pkt')
                      : `${pScore} pkt${typeof safeRound.distance === 'number' ? ` (${Math.round(safeRound.distance)}m)` : ''}`}
                  </span>
                  {!challengeId && (
                    <>
                      <span className="quiz-summary__round-vs">vs</span>
                      <span className="quiz-summary__round-bot">
                        {safeBotRound
                          ? `${Number(safeBotRound.score) || 0} pkt${typeof safeBotRound.distance === 'number' ? ` (${Math.round(safeBotRound.distance)}m)` : ''}`
                          : '-'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Challenge Leaderboard (Only shown for challenges) */}
        {challengeId && showDetails && (
          <div className="quiz-summary__leaderboard animate-fade-in-up" style={{ width: '100%', marginTop: '1.5rem' }}>
            <h3 className="quiz-summary__rounds-title">Ranking wyzwania (Top 10)</h3>
            {loadingLeaderboard ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Wczytywanie rankingu...</p>
            ) : challengeLeaderboard.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Brak zapisanych wyników. Bądź pierwszy!</p>
            ) : (
              <div className="leaderboard-table-card glass-card" style={{ padding: '8px', marginTop: '8px' }}>
                <table className="clean-leaderboard-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                        <th style={{ width: '40px' }}>Poz.</th>
                        <th>Gracz</th>
                        <th style={{ width: '70px', textAlign: 'right', color: 'var(--green-primary)' }}>Pkt</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Max</th>
                      </tr>
                  </thead>
                  <tbody>
                    {challengeLeaderboard.map((row, idx) => {
                      const isSelf = user.email && row.email?.toLowerCase().trim() === user.email.toLowerCase().trim();
                      const isCustom = row.avatarId === 'custom' && row.customAvatar;
                      const avatarImg = isCustom ? row.customAvatar : (AVATARS.find(a => a.id === row.avatarId)?.image);
                      return (
                        <tr key={idx} className={isSelf ? 'leaderboard-row--current-user' : ''} style={{ background: isSelf ? 'rgba(22, 163, 74, 0.08)' : 'transparent' }}>
                          <td style={{ fontWeight: '700' }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div 
                                className={`challenge-rank-avatar-circle ${row.isPremium ? 'premium-glow-avatar' : ''}`}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}
                              >
                                {avatarImg ? (
                                  <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span className="line-icon line-icon--user" aria-hidden="true" />
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                                <span style={{ fontWeight: '700', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  {row.name} {isSelf && <span className="player-you-tag" style={{ marginLeft: '4px', fontSize: '0.55rem' }}>Ty</span>}
                                  {row.isPremium && <span className="player-you-tag">Premium</span>}
                                </span>
                                <span style={{ fontSize: '0.62rem', opacity: 0.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                  {maskEmail(row.email)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--green-primary)', whiteSpace: 'nowrap' }}>{row.score}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{maxScore}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="quiz-summary__actions animate-fade-in-up" style={{ animationDelay: '1s' }}>
          <button className="btn-primary" onClick={handlePlayAgain}>
            Zagraj ponownie
          </button>
          <button className="btn-secondary" onClick={handleExit}>
            Wróć do Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizSummary;
