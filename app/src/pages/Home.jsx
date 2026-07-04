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
    icon: '/icons/pin.svg',
    title: 'Gdzie jest ta ulica?',
    description: 'Upuść pinezkę jak najbliżej wylosowanej ulicy',
    available: true,
  },
  {
    id: 'where-is-place',
    path: '/game/where-is-place',
    icon: '/icons/flag.svg',
    title: 'Gdzie jest to miejsce?',
    description: 'Zaznacz popularne miejsce w Legnicy',
    available: true,
  },
];

const ADDRESS_MODES = [
  {
    id: 'what-street',
    path: '/game/what-street',
    icon: '/icons/keyboard.svg',
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
  const completedChallenges = dailyChallenges.filter(ch => userAttempts[ch.id] !== undefined).length;

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
              icon: 'scan',
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
              icon: 'pin',
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
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="challenge-card__fallback-svg">
          <path d="M0,50 Q25,20 50,50 T100,50" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="3" fill="none" />
          <path d="M20,10 L20,90" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <path d="M80,10 L80,90" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <path d="M10,80 L90,80" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <circle cx="50" cy="50" r="4" fill="var(--green-primary)" />
        </svg>
        <span className="challenge-card__fallback-icon svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
      </div>
    );
  };

  return (
    <div className="home">
      <div className="home-map-layer" aria-hidden="true">
        <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          <path d="M-40 410 C180 360 260 440 430 385 S720 260 980 330 1240 250 1300 290" />
          <path d="M60 610 C180 500 310 520 460 470 S710 380 900 455 1110 560 1260 470" />
          <path d="M120 90 C260 180 300 280 420 340 S650 420 720 610" />
          <path d="M500 -20 C560 150 560 290 650 390 S790 520 820 780" />
          <path d="M820 30 C760 190 810 310 960 420 S1110 560 1080 760" />
          <path d="M210 120 L340 210 L300 330 L420 430 L370 570" />
          <path d="M650 95 L770 175 L720 290 L840 365 L790 520" />
          <path d="M940 130 L1030 230 L990 345 L1100 420 L1060 575" />
          <circle cx="540" cy="390" r="76" />
          <circle cx="540" cy="390" r="152" />
        </svg>
      </div>

      {/* Redesigned top navbar */}
      <TopNav />

      {/* Hero Section */}
      <header className="home-hero">
        <div className="home-hero__content">
          <section className="home-hero__panel">
            <div>
              <h1 className="home-hero__title text-display">
                Precyzja miasta.
                <span> Rywalizacja na mapie.</span>
              </h1>
            </div>
            <div className="home-hero__side">
              <p>Rozpoznawaj ulice, wskazuj miejsca i sprawdzaj, kto naprawdę zna układ miasta.</p>
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
              <span className="offline-banner__icon line-icon line-icon--alert" aria-hidden="true" />
              <div>
                <strong>Brak odpowiedzi z bazy chmurowej:</strong> Działasz w trybie offline. Wyzwania i ranking są ładowane lokalnie.
              </div>
            </div>
          )}

          <div className="challenges-header-container">
            <div className="home-section-heading">
              <h2 className="home-modes__title text-heading">CODZIENNE WYZWANIA</h2>
              <p>Ukończono {completedChallenges} z {dailyChallenges.length || 0} dzisiejszych wyzwań</p>
            </div>
            <div className="challenges-nav-arrows">
              <button 
                className="challenges-nav-arrow" 
                onClick={() => scrollCarousel('left')}
                aria-label="Wstecz"
              >
                <span className="svg-icon" style={{ '--icon': 'url(/icons/arrows/left.svg)' }} aria-hidden="true" />
              </button>
              <button 
                className="challenges-nav-arrow" 
                onClick={() => scrollCarousel('right')}
                aria-label="Dalej"
              >
                <span className="svg-icon" style={{ '--icon': 'url(/icons/arrows/right.svg)' }} aria-hidden="true" />
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
                    <div className="challenge-card__top">
                      {renderChallengeImage(challenge)}
                    </div>

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

                      <div className="challenge-card__footer">
                        <button className={`challenge-card__btn ${hasPlayed ? 'challenge-card__btn--done' : ''}`}>
                          {hasPlayed ? (
                            <>Zdobyto <span>{score || 0}/1000 pkt</span></>
                          ) : 'Rozpocznij'}
                        </button>
                        <div className="challenge-card__meta">
                          <span className="challenge-pill">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                            {challenge.rounds} rund
                          </span>
                          <span className="challenge-pill">{challenge.timeLimit || 15}s</span>
                          <span className="challenge-pill">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
                            {timeUntilMidnight.slice(0, 5)} do końca
                          </span>
                        </div>
                      </div>
                      <span className="card-arrow svg-icon" style={{ '--icon': 'url(/icons/arrows/right.svg)' }} aria-hidden="true" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Tryby gry */}
        <div className="home-modes__section">
          <div className="home-section-heading">
            <h2 className="home-modes__title text-heading">TRYBY GRY</h2>
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
