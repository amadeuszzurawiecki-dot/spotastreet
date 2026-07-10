import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/Navigation/TopNav';
import useUserProfile from '../hooks/useUserProfile';
import { fetchDailyChallenges } from '../config/firebase';
import './Home.css';
import './Challenges.css';

function getChallengeWindow(challenge) {
  const startAt = challenge.startAt || (challenge.date ? `${challenge.date}T00:00` : '');
  const endAt = challenge.endAt || (challenge.date ? `${challenge.date}T23:59` : '');
  return {
    start: startAt ? new Date(startAt) : null,
    end: endAt ? new Date(endAt) : null,
  };
}

function isChallengeActiveNow(challenge, now = new Date()) {
  if (challenge.disabled) return false;
  const { start, end } = getChallengeWindow(challenge);
  const nowMs = now.getTime();

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return start.getTime() <= nowMs && end.getTime() >= nowMs;
  }

  const todayStr = now.toLocaleDateString('sv').substring(0, 10);
  return challenge.date === todayStr;
}

function formatChallengeRemaining(challenge, now = new Date()) {
  const { end } = getChallengeWindow(challenge);
  const fallbackEnd = new Date(now);
  fallbackEnd.setHours(24, 0, 0, 0);
  const endDate = end && !Number.isNaN(end.getTime()) ? end : fallbackEnd;
  const diffMs = Math.max(0, endDate.getTime() - now.getTime());

  const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
  const minutes = String(Math.floor((diffMs / (1000 * 60)) % 60)).padStart(2, '0');
  const seconds = String(Math.floor((diffMs / 1000) % 60)).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function Challenges() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const userAttempts = user.challengeAttempts || {};
  const completedChallenges = challenges.filter(challenge => userAttempts[challenge.id] !== undefined).length;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadChallenges() {
      try {
        const now = new Date();
        const allChallenges = await fetchDailyChallenges();
        if (allChallenges === null) setIsOffline(true);
        const active = allChallenges ? allChallenges.filter(challenge => isChallengeActiveNow(challenge, now)) : [];
        setChallenges(active);
      } catch (err) {
        console.warn('Error loading challenges page:', err);
        setIsOffline(true);
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, []);

  const handleChallengeClick = (challenge) => {
    const attemptScore = userAttempts[challenge.id];
    if (attemptScore !== undefined) {
      alert(`Brałeś już udział w tym wyzwaniu! Twój wynik: ${attemptScore} pkt.`);
      return;
    }

    const confirmPlay = window.confirm(
      `Rozpoczynasz wyzwanie "${challenge.title}"!\nMasz tylko JEDNĄ próbę. Czy jesteś gotowy?`
    );
    if (!confirmPlay) return;

    let gamePath = '/game/where-is-street';
    if (challenge.gameMode === 'what-street') gamePath = '/game/what-street';
    else if (challenge.gameMode === 'where-is-place') gamePath = '/game/where-is-place';

    navigate(gamePath, { state: { challenge } });
  };

  const renderChallengeImage = (challenge) => {
    if (challenge.imageUrl) {
      return <img src={challenge.imageUrl} alt={challenge.title} className="challenge-card__img" />;
    }

    return (
      <div className="challenge-card__fallback-img">
        <span className="challenge-card__fallback-icon svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
      </div>
    );
  };

  return (
    <div className="challenges-page">
      <TopNav />

      <main className="challenges-container">
        <section className="home-modes__section challenges-page__section">
          {isOffline && (
            <div className="offline-banner">
              <span className="offline-banner__icon line-icon line-icon--alert" aria-hidden="true" />
              <div>
                <strong>Brak odpowiedzi z bazy chmurowej:</strong> Działasz w trybie offline. Wyzwania są ładowane lokalnie.
              </div>
            </div>
          )}

          <div className="home-section-heading">
            <div>
              <h1 className="home-modes__title text-heading">Wyzwania</h1>
              <p className="challenges-page__lead">Wybierz aktywne wyzwanie i powalcz o miejsce w rankingu.</p>
            </div>
            <p>Ukończono {completedChallenges} z {challenges.length || 0} aktywnych wyzwań</p>
          </div>

          {loading ? (
            <div className="home-loading-challenges">Wczytywanie wyzwań...</div>
          ) : challenges.length === 0 ? (
            <div className="home-empty-challenges">
              <span className="home-empty-challenges__icon svg-icon" style={{ '--icon': 'url(/icons/ribbon.svg)' }} aria-hidden="true" />
              <div>
                <h3>Brak aktywnych wyzwań</h3>
                <p>Zajrzyj tu później.</p>
              </div>
            </div>
          ) : (
            <div className="challenges-page__grid">
              {challenges.map((challenge) => {
                const score = userAttempts[challenge.id];
                const hasPlayed = score !== undefined;
                const maxScore = (challenge.rounds || 15) * 100;
                return (
                  <button
                    type="button"
                    key={challenge.id}
                    className={`challenge-card challenges-page__card ${hasPlayed ? 'challenge-card--played' : ''}`}
                    onClick={() => handleChallengeClick(challenge)}
                  >
                    <div className="challenge-card__top">
                      {renderChallengeImage(challenge)}
                      <div className="challenge-card__image-pills">
                        <span className="challenge-pill challenge-pill--light">
                          <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                          {challenge.rounds} rund
                        </span>
                        {hasPlayed ? (
                          <span className="challenge-pill challenge-pill--score">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/star.svg)' }} aria-hidden="true" />
                            <span className="challenge-pill__score">{score || 0}</span><span className="challenge-pill__max">/{maxScore}pkt</span>
                          </span>
                        ) : (
                          <span className="challenge-pill challenge-pill--dark">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
                            {formatChallengeRemaining(challenge, currentTime)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="challenge-card__bottom">
                      <div className="challenge-card__details">
                        <h3 className="challenge-card__title">{challenge.title}</h3>
                        <p className="challenge-card__desc">{challenge.description}</p>
                      </div>
                      <span className="card-arrow svg-icon" style={{ '--icon': 'url(/icons/arrows/right.svg)' }} aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Challenges;
