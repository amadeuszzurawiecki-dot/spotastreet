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
    icon: '⛳',
    title: 'Gdzie jest ta ulica?',
    description: 'Upuść pinezkę jak najbliżej wylosowanej ulicy',
    available: true,
  },
  {
    id: 'where-is-place',
    path: '/game/where-is-place',
    icon: '🏰',
    title: 'Gdzie jest to miejsce?',
    description: 'Zaznacz popularne miejsce w Legnicy',
    available: true,
  },
];

const ADDRESS_MODES = [
  {
    id: 'what-street',
    path: '/game/what-street',
    icon: '🔍',
    title: 'Co to za ulica?',
    description: 'Rozpoznaj ulicę podświetloną na mapie',
    available: true,
  },
];

function Home() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState('00:00:00');
  const carouselRef = useRef(null);

  const avatar = AVATARS.find(a => a.id === user.avatarId) || AVATARS[0];
  const userAttempts = user.challengeAttempts || {};

  // Countdown timer to midnight (HH:MM:SS)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // next midnight
      const diffMs = midnight - now;

      const hours = String(Math.floor((diffMs / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const minutes = String(Math.floor((diffMs / (1000 * 60)) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((diffMs / 1000) % 60)).padStart(2, '0');

      setTimeUntilMidnight(`${hours}:${minutes}:${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch daily challenges
  useEffect(() => {
    async function load() {
      try {
        const todayStr = new Date().toLocaleDateString('sv').substring(0, 10); // YYYY-MM-DD
        const allChallenges = await fetchDailyChallenges();
        
        if (allChallenges === null) {
          setIsOffline(true);
        }

        // Filter challenges for today (exclude disabled challenges)
        let active = allChallenges ? allChallenges.filter(ch => ch.date === todayStr && !ch.disabled) : [];
        
        // Fallbacks if empty or offline
        if (active.length === 0) {
          active = [
            {
              id: 'default_cudow',
              title: 'Znawca Dzielnicy Cudów',
              description: 'Rozpoznaj słynne patusiarskie ulice',
              icon: '☠️',
              rounds: 15,
              timeLimit: 15,
              gameMode: 'what-street',
              streets: ['Kamienna', 'Limanowskiego', 'Partyzantów', 'Roosevelta', 'Kartuska', 'Pobożnego', 'Kolejowa', 'Głogowska', 'Wrocławska', 'Kopernika', 'Najświętszej Marii Panny', 'Chrobrego'],
              date: todayStr,
              imageUrl: '/images/challenge_1.png'
            },
            {
              id: 'default_sienkiewicza',
              title: 'Ekspert z Osiedla Sienkiewicza',
              description: 'Henryk byłby dumny',
              icon: '🌷',
              rounds: 15,
              timeLimit: 15,
              gameMode: 'where-is-street',
              streets: ['Sienkiewicza', 'Prusa', 'Asnyka', 'Orzeszkowej', 'Konopnickiej', 'Reymonta', 'Wyspiańskiego'],
              date: todayStr,
              imageUrl: '/images/challenge_2.png'
            }
          ];
        }
        setDailyChallenges(active);
      } catch (err) {
        console.warn('Error loading challenges:', err);
        setIsOffline(true);
      } finally {
        setLoadingChallenges(false);
      }
    }
    load();
  }, []);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
        <div className="mode-card__icon">{mode.icon}</div>
        <div className="mode-card__content">
          <h3 className="mode-card__title">{mode.title}</h3>
          <p className="mode-card__desc">{mode.description}</p>
        </div>
      </button>
    );
  };

  const renderChallengeImage = (challenge) => {
    if (challenge.imageUrl) {
      return <img src={challenge.imageUrl} alt={challenge.title} className="challenge-card__img" />;
    }
    return (
      <div className="challenge-card__fallback-img">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="challenge-card__fallback-svg">
          <path d="M0,50 Q25,20 50,50 T100,50" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="3" fill="none" />
          <path d="M20,10 L20,90" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <path d="M80,10 L80,90" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <path d="M10,80 L90,80" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <circle cx="50" cy="50" r="4" fill="var(--green-primary)" />
        </svg>
        <span className="challenge-card__fallback-icon">{challenge.icon || '🏁'}</span>
      </div>
    );
  };

  return (
    <div className="home">
      {/* Background Glow extending to top right edge */}
      <div className="home-top-glow" />

      {/* Redesigned top navbar */}
      <TopNav />

      {/* Hero Section */}
      <header className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__node" aria-hidden="true" />
          <section className="home-hero__panel">
            <div>
              <span className="home-hero__eyebrow">LEGNICA / SILNIK ROZGRYWKI</span>
              <h1 className="home-hero__title text-display">
                Precyzja miasta.
                <span> Rywalizacja na mapie.</span>
              </h1>
            </div>
            <div className="home-hero__side">
              <p>Rozpoznawaj ulice, wskazuj miejsca i sprawdzaj, kto naprawdę zna układ miasta.</p>
              <button className="home-hero__action" onClick={() => navigate('/game/what-street')}>
                Zacznij grę →
              </button>
            </div>
          </section>
          <div className="home-hero__scroll">TRYBY GRY PONIŻEJ ↓</div>
        </div>
      </header>

      {/* Game Modes & Challenges */}
      <main className="home-modes">
        {/* Section: Codzienne wyzwania */}
        <div className="home-modes__section">
          {isOffline && (
            <div className="offline-banner">
              <span className="offline-banner__icon">⚠️</span>
              <div>
                <strong>Brak odpowiedzi z bazy chmurowej:</strong> Działasz w trybie offline. Wyzwania i ranking są ładowane lokalnie.
              </div>
            </div>
          )}

          <div className="challenges-header-container">
            <h2 className="home-modes__title text-heading">CODZIENNE WYZWANIA</h2>
            <div className="challenges-nav-arrows">
              <button 
                className="challenges-nav-arrow" 
                onClick={() => scrollCarousel('left')}
                aria-label="Wstecz"
              >
                ←
              </button>
              <button 
                className="challenges-nav-arrow" 
                onClick={() => scrollCarousel('right')}
                aria-label="Dalej"
              >
                →
              </button>
            </div>
          </div>

          <div className="challenges-carousel" ref={carouselRef}>
            {loadingChallenges ? (
              <div className="home-loading-challenges">Wczytywanie wyzwań...</div>
            ) : (
              dailyChallenges.map((challenge, idx) => {
                const score = userAttempts[challenge.id];
                const hasPlayed = score !== undefined;
                return (
                  <div
                    key={challenge.id}
                    className={`challenge-card ${hasPlayed ? 'challenge-card--played' : ''}`}
                    onClick={() => handleChallengeClick(challenge)}
                  >
                    {/* Top half: Image & Floating Pills overlay */}
                    <div className="challenge-card__top">
                      {renderChallengeImage(challenge)}
                      <div className="challenge-card__image-pills">
                        <span className={`challenge-pill ${hasPlayed ? 'challenge-pill--points-green' : 'challenge-pill--points-gray'}`}>
                          {hasPlayed ? `${score} pkt` : '- pkt'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span className="challenge-pill challenge-pill--meta">
                            {challenge.rounds} rund • {challenge.timeLimit || 15}s
                          </span>
                          <span className="challenge-pill challenge-pill--time">
                            {timeUntilMidnight}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom half: Title (with Marquee if long), Subtitle, Button */}
                    <div className="challenge-card__bottom">
                      <div className="challenge-card__details">
                        <div className="challenge-card__title-container">
                          {challenge.title.length > 22 ? (
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
                      
                      <button className="challenge-card__btn">
                        {hasPlayed ? 'Ukończono' : 'Rozpocznij wyzwanie'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Tryby gry */}
        <div className="home-modes__section">
          <h2 className="home-modes__title text-heading">TRYBY GRY</h2>
          <div className="home-modes__grid">
            {PIN_MODES.map((mode, idx) => renderModeCard(mode, idx))}
            {ADDRESS_MODES.map((mode, idx) => renderModeCard(mode, idx))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p>Stworzono z ⚡ dla Legnickich Bolciarzy</p>
      </footer>
    </div>
  );
}

export default Home;
