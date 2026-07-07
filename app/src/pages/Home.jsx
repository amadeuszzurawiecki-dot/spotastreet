import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from '../components/Navigation/TopNav';
import { AVATARS } from '../data/avatars';
import { fetchDailyChallenges } from '../config/firebase';
import './Home.css';

const PIN_MODES = [
  {
    id: 'where-is-street',
    path: '/game/where-is-street',
    icon: '/icons/umiesc.svg',
    title: 'Wskaż ulicę',
    description: 'Umieść pinezkę nad tą ulicą',
    available: true,
  },
];

const ADDRESS_MODES = [
  {
    id: 'what-street',
    path: '/game/what-street',
    icon: '/icons/nazwij.svg',
    title: 'Nazwij ulicę',
    description: 'Nazwij podświetloną ulicę',
    available: true,
  },
];

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

function Home() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [isChallengeSliding, setIsChallengeSliding] = useState(false);
  const [challengeSlideDistance, setChallengeSlideDistance] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const challengeViewportRef = useRef(null);

  const avatar = AVATARS.find(a => a.id === user.avatarId) || AVATARS[0];
  const userAttempts = user.challengeAttempts || {};
  const completedChallenges = dailyChallenges.filter(ch => userAttempts[ch.id] !== undefined).length;
  const shouldLoopChallenges = !isMobileView && dailyChallenges.length >= 4;

  // Countdown timer tick for challenge time windows.
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch daily challenges
  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const allChallenges = await fetchDailyChallenges();
        
        if (allChallenges === null) {
          setIsOffline(true);
        }

        // Filter active challenges (exclude disabled challenges). No hardcoded fallbacks here:
        // if there are no active challenges, the UI should show an empty state.
        const active = allChallenges ? allChallenges.filter(ch => isChallengeActiveNow(ch, now)) : [];
        setDailyChallenges(active);
      } catch (err) {
        console.warn('Error loading challenges:', err);
        setIsOffline(true);
        setDailyChallenges([]);
      } finally {
        setLoadingChallenges(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!shouldLoopChallenges) return undefined;

    const interval = setInterval(() => {
      setIsChallengeSliding(true);
      window.setTimeout(() => {
        setChallengeIndex((currentIndex) => (currentIndex + 1) % dailyChallenges.length);
        setIsChallengeSliding(false);
      }, 640);
    }, 3000);

    return () => clearInterval(interval);
  }, [shouldLoopChallenges, dailyChallenges.length]);

  useEffect(() => {
    const updateSlideDistance = () => {
      const viewport = challengeViewportRef.current;
      setIsMobileView(window.innerWidth <= 620);
      if (!viewport) return;

      const cardGap = 16;
      const visibleCards = window.innerWidth <= 620 ? 1 : 3;
      const cardWidth = visibleCards === 1
        ? viewport.clientWidth
        : (viewport.clientWidth - cardGap * (visibleCards - 1)) / visibleCards;

      setChallengeSlideDistance(cardWidth + cardGap);
    };

    updateSlideDistance();
    window.addEventListener('resize', updateSlideDistance, { passive: true });

    return () => window.removeEventListener('resize', updateSlideDistance);
  }, [dailyChallenges.length]);

  const visibleChallenges = shouldLoopChallenges
    ? [0, 1, 2, 3].map((offset) => dailyChallenges[(challengeIndex + offset) % dailyChallenges.length])
    : dailyChallenges;

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

    // Direct game mode paths
    let gamePath = '/game/where-is-street';
    if (challenge.gameMode === 'what-street') gamePath = '/game/what-street';
    else if (challenge.gameMode === 'where-is-place') gamePath = '/game/where-is-place';

    navigate(gamePath, { state: { challenge } });
  };

  const renderModeCard = (mode, index) => {
    return (
      <button
        key={mode.id}
        className={`mode-card ${!mode.available ? 'mode-card--locked' : ''}`}
        onClick={() => mode.available && navigate(mode.path)}
        disabled={!mode.available}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <span className="mode-card__icon-wrap" aria-hidden="true">
          <span className="svg-icon mode-card__svg" style={{ '--icon': `url(${mode.icon})` }} />
        </span>
        <div className="mode-card__content">
          <h3 className="mode-card__title">{mode.title}</h3>
          <p className="mode-card__desc">{mode.description}</p>
        </div>
        <span className="card-arrow svg-icon" style={{ '--icon': 'url(/icons/arrows/right.svg)' }} aria-hidden="true" />
      </button>
    );
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
    <div className="home">
      {/* Redesigned top navbar */}
      <TopNav />

      {/* Game Modes & Challenges */}
      <main className="home-modes">
        {/* Section: Codzienne wyzwania */}
        <div className="home-modes__section">
          {isOffline && (
            <div className="offline-banner">
              <span className="offline-banner__icon line-icon line-icon--alert" aria-hidden="true" />
              <div>
                <strong>Brak odpowiedzi z bazy chmurowej:</strong> Działasz w trybie offline. Wyzwania i ranking są ładowane lokalnie.
              </div>
            </div>
          )}

          <div className="challenges-header-container">
            <div className="home-section-heading">
              <h2 className="home-modes__title text-heading">Codzienne wyzwania</h2>
              <p>Ukończono {completedChallenges} z {dailyChallenges.length || 0} dzisiejszych wyzwań</p>
            </div>
          </div>

          <div className="challenges-carousel" ref={challengeViewportRef}>
            {loadingChallenges ? (
              <div className="home-loading-challenges">Wczytywanie wyzwań...</div>
            ) : visibleChallenges.length === 0 ? (
              <div className="home-empty-challenges">
                <span className="home-empty-challenges__icon line-icon line-icon--target" aria-hidden="true" />
                <div>
                  <h3>Brak wyzwań</h3>
                  <p>Zajrzyj tu później.</p>
                </div>
              </div>
            ) : (
              <div
                className={`challenges-carousel__track ${shouldLoopChallenges ? 'challenges-carousel__track--looping' : 'challenges-carousel__track--static'} ${isChallengeSliding ? 'challenges-carousel__track--sliding' : ''}`}
                style={{ '--challenge-slide-distance': `${challengeSlideDistance}px` }}
              >
                {visibleChallenges.map((challenge, visibleIndex) => {
                  const score = userAttempts[challenge.id];
                  const hasPlayed = score !== undefined;
                  const maxScore = (challenge.rounds || 15) * 100;
                  return (
                    <div
                      key={`${challenge.id}-${visibleIndex}`}
                      className={`challenge-card ${hasPlayed ? 'challenge-card--played' : ''}`}
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
                          <div className="challenge-card__title-container">
                            {shouldLoopChallenges && challenge.title.length > 22 ? (
                              <div className="marquee-text-wrapper">
                                <span className="marquee-text">
                                  {challenge.title} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {challenge.title} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                </span>
                              </div>
                            ) : (
                              <h3 className="challenge-card__title">{challenge.title}</h3>
                            )}
                          </div>
                          <p className="challenge-card__desc">{challenge.description}</p>
                        </div>
                        <span className="card-arrow svg-icon" style={{ '--icon': 'url(/icons/arrows/right.svg)' }} aria-hidden="true" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section: Tryby gry */}
        <div className="home-modes__section">
          <div className="home-section-heading">
            <h2 className="home-modes__title text-heading">Tryby gry</h2>
            <p>Wybierz tryb i sprawdź znajomość Legnicy</p>
          </div>
          <div className="home-modes__grid">
            {PIN_MODES.map((mode, idx) => renderModeCard(mode, idx))}
            {ADDRESS_MODES.map((mode, idx) => renderModeCard(mode, idx))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
