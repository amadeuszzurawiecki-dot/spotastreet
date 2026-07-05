import './HUD.css';

/**
 * Round info display — top-left panel
 */
export function RoundInfo({ currentRound, totalRounds, label, streetName }) {
  return (
    <div className="hud-round glass-card animate-slide-down" style={{ animation: 'slideDown 0.4s both' }}>
      <div className="hud-round__header">RUNDA {currentRound}/{totalRounds}</div>
      <div className="hud-round__label">
        {label}: <span className="hud-round__street">{streetName}</span>
      </div>
    </div>
  );
}

/**
 * Circular countdown timer
 */
export function Timer({ timeLeft, progress, isRunning }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  // Color transitions: green → yellow → red
  let timerColor = '#00E676';
  if (progress < 0.5) timerColor = '#FF9800';
  if (progress < 0.25) timerColor = '#F44336';
  
  return (
    <div className="hud-timer">
      <svg className="hud-timer__svg" width="56" height="56" viewBox="0 0 56 56">
        {/* Background circle */}
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke={timerColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke 0.3s ease' }}
        />
      </svg>
      <span className="hud-timer__value" style={{ color: timerColor }}>
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}

/**
 * Score display — top-right
 */
export function ScoreDisplay({ score, label = 'PUNKTY' }) {
  return (
    <div className="hud-score glass-card" style={{ animation: 'slideDown 0.4s 0.1s both' }}>
      <div className="hud-score__label">{label}</div>
      <div className="hud-score__value">{score}</div>
    </div>
  );
}

/**
 * Bot badge — shows bot's running score
 */
export function BotBadge({ name, avatar, score, roundScore }) {
  return (
    <div className="hud-bot glass-card" style={{ animation: 'slideDown 0.4s 0.15s both' }}>
      <span className="hud-bot__avatar">{avatar}</span>
      <div className="hud-bot__info">
        <span className="hud-bot__name">{name}</span>
        <span className="hud-bot__score">{score} pkt</span>
      </div>
      {roundScore !== undefined && roundScore !== null && (
        <span className="hud-bot__round-score">+{roundScore}</span>
      )}
    </div>
  );
}

/**
 * Unified premium Game HUD - matches Figma design
 */
export function GameHUD({
  playerName,
  playerAvatar,
  playerBg,
  playerScore,
  playerRoundPoints,
  playerIsPremium = false,
  
  opponentName = 'Legniczanin',
  opponentAvatar = 'AI',
  opponentBg = '#2A2A3E',
  opponentScore,
  opponentRoundPoints,
  opponentIsPremium = false,
  
  timeLeft,
  progress,
  isRunning,
  
  currentRound,
  totalRounds,
  isTraining,
  isChallenge,
  isShowingResult,
  onBackClick
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (isShowingResult ? 0 : progress));
  
  // Timer color transition: green → orange at 50% → red at ~33% (~5s on 15s timer)
  let timerColor = '#00E676';
  if (progress < 0.5) timerColor = '#FF9800';
  if (progress < 0.34) timerColor = '#F44336';
  if (isShowingResult) timerColor = 'rgba(255,255,255,0.15)';

  return (
    <div className="hud-unified-layout animate-slide-down">
      {/* Top Left: Back button */}
      <button
        type="button"
        className="hud-unified-back"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onBackClick?.();
        }}
      >
        <span className="hud-unified-back__arrow">‹</span> Zakończ grę
      </button>

      {/* Top Right: Round Badge */}
      <div className="hud-unified-round-badge">
        RUNDA {currentRound} Z {totalRounds}
      </div>

      {/* Center Unified HUD Card */}
      <div className="hud-unified-card glass-card">
        {/* Left Side: Player */}
        <div className="hud-unified-side hud-unified-side--player">
          <div className="hud-unified-pill">
            <span className={`hud-unified-avatar ${playerIsPremium ? 'premium-glow-avatar' : ''}`} style={{ backgroundColor: playerBg || '#3b82f6' }}>
              {playerAvatar}
            </span>
            <span className="hud-unified-name">{playerName}</span>
          </div>
          <div className="hud-unified-score">
            <span className="hud-unified-score-val">{playerScore}</span>
            {isShowingResult && playerRoundPoints !== undefined && (
              <span className="hud-unified-pts-added hud-unified-pts-added--green">+{playerRoundPoints}</span>
            )}
          </div>
        </div>

        {/* Center: Timer */}
        <div className="hud-unified-timer-container">
          <div className="hud-unified-timer">
            <svg className="hud-unified-timer__svg" width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
              <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke={timerColor}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke 0.3s ease' }}
              />
            </svg>
            <span className="hud-unified-timer__val" style={{ color: isShowingResult ? '#cbd5e1' : timerColor }}>
              {isShowingResult ? '-' : Math.ceil(timeLeft)}
            </span>
          </div>
        </div>

        {/* Right Side: Opponent or Training/Challenge Badge */}
        {isTraining || isChallenge ? (
          <div className="hud-unified-side hud-unified-side--training">
            <div 
              className="hud-unified-pill hud-unified-pill--training" 
              style={isChallenge ? { background: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.25)', color: 'var(--green-primary)' } : {}}
            >
              <span>{isChallenge ? 'Wyzwanie' : 'Trening'}</span>
            </div>
            <div className="hud-unified-score">
              <span className="hud-unified-score-val" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isChallenge ? 'WYZWANIE DNIA' : 'TRYB ĆWICZEŃ'}
              </span>
            </div>
          </div>
        ) : (
          <div className="hud-unified-side hud-unified-side--opponent">
            <div className="hud-unified-pill">
              <span className={`hud-unified-avatar ${opponentIsPremium ? 'premium-glow-avatar' : ''}`} style={{ backgroundColor: opponentBg }}>
                {opponentAvatar}
              </span>
              <span className="hud-unified-name">{opponentName}</span>
            </div>
            <div className="hud-unified-score">
              <span className="hud-unified-score-val">{opponentScore}</span>
              {isShowingResult && opponentRoundPoints !== undefined && (
                <span className="hud-unified-pts-added hud-unified-pts-added--green">+{opponentRoundPoints}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
