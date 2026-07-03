import { getDistanceFeedback, formatDistance } from '../utils/scoring';
import './RoundResult.css';

/**
 * Slide-up modal showing round results
 */
function RoundResult({
  type, // 'distance' | 'street-guess'
  playerScore,
  playerDistance,
  playerCorrect,
  botScore,
  botDistance,
  botCorrect,
  streetName,
  timedOut,
  onNext,
  isLastRound,
  totalPlayerScore,
  totalBotScore,
}) {
  const feedback = type === 'distance' 
    ? (timedOut ? { tier: 'bad', color: '#F44336', emoji: '⏰', label: 'Czas minął!' } : getDistanceFeedback(playerDistance))
    : (playerCorrect ? { tier: 'perfect', color: '#00E676', emoji: '🎯', label: 'Świetnie!' } : { tier: 'bad', color: '#F44336', emoji: '❌', label: timedOut ? 'Czas minął!' : 'Pudło!' });

  return (
    <div className="round-result-overlay">
      <div className="round-result glass-card animate-slide-up">
        {/* Player Result */}
        <div className="round-result__header" style={{ color: feedback.color }}>
          <span className="round-result__emoji">{feedback.emoji}</span>
          <span className="round-result__label">{feedback.label}</span>
        </div>

        {type === 'distance' && !timedOut && playerDistance !== undefined && (
          <div className="round-result__distance">
            Pudło o <span style={{ color: feedback.color }}>{formatDistance(playerDistance)}</span>
          </div>
        )}

        {type === 'street-guess' && !playerCorrect && (
          <div className="round-result__street">
            To ulica <strong>{streetName}</strong>
          </div>
        )}

        <div className="round-result__scores-row">
          <div className="round-result__player-score">
            <span className="round-result__score-label">Twoje punkty</span>
            <span className="round-result__score-value">+{playerScore} pkt</span>
            {type === 'distance' && !timedOut && playerDistance !== undefined && (
              <span className="round-result__score-detail">({formatDistance(playerDistance)})</span>
            )}
            {type === 'street-guess' && (
              <span className="round-result__score-detail">({playerCorrect ? '✓' : '✗'})</span>
            )}
          </div>
          
          <div className="round-result__bot-score-container">
            <span className="round-result__score-label">🤖 Legniczanin</span>
            <span className="round-result__score-value">+{botScore} pkt</span>
            {type === 'distance' && botDistance !== undefined && (
              <span className="round-result__score-detail">({formatDistance(botDistance)})</span>
            )}
            {type === 'street-guess' && (
              <span className="round-result__score-detail">({botCorrect ? '✓' : '✗'})</span>
            )}
          </div>
        </div>

        {/* Running totals */}
        <div className="round-result__totals">
          <div className="round-result__total">
            <span className="round-result__total-label">Ty</span>
            <span className="round-result__total-value">{totalPlayerScore}</span>
          </div>
          <div className="round-result__total-vs">vs</div>
          <div className="round-result__total">
            <span className="round-result__total-label">Bot</span>
            <span className="round-result__total-value">{totalBotScore}</span>
          </div>
        </div>

        <button className="btn-primary" onClick={onNext}>
          {isLastRound ? 'Zakończ grę' : 'Następna ulica'}
        </button>
      </div>
    </div>
  );
}

export default RoundResult;
