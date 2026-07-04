import { useState, useEffect } from 'react';
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
    description: 'Upuść pinezkę na wylosowanej ulicy',
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
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeCycle, setChallengeCycle] = useState(0);

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

  useEffect(() => {
    if (dailyChallenges.length <= 1) return undefined;

    const interval = setInterval(() => {
      setChallengeIndex((currentIndex) => (currentIndex + 1) % dailyChallenges.length);
      setChallengeCycle((currentCycle) => currentCycle + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [dailyChallenges.length]);

  const visibleChallenges = dailyChallenges.length > 1
    ? [0, 1].map((offset) => dailyChallenges[(challengeIndex + offset) % dailyChallenges.length])
    : dailyChallenges.length === 1
      ? [dailyChallenges[0]]
    : [];

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
          <div className="home-hero__scroll">PODEJMIJ CODZIENNE WYZWANIE!</div>
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
              <h2 className="home-modes__title text-heading">Codzienne wyzwania</h2>
              <p>Ukończono {completedChallenges} z {dailyChallenges.length || 0} dzisiejszych wyzwań</p>
            </div>
          </div>

          <div className="challenges-carousel" key={challengeCycle}>
            {loadingChallenges ? (
              <div className="home-loading-challenges">Wczytywanie wyzwań...</div>
            ) : (
              visibleChallenges.map((challenge, visibleIndex) => {
                const score = userAttempts[challenge.id];
                const hasPlayed = score !== undefined;
                return (
                  <div
                    key={`${challenge.id}-${challengeCycle}-${visibleIndex}`}
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
                        <span className="challenge-pill challenge-pill--light">
                          {challenge.timeLimit || 15}s
                        </span>
                        <span className="challenge-pill challenge-pill--dark">
                          <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
                          {timeUntilMidnight}
                        </span>
                      </div>
                      <button className={`challenge-card__btn ${hasPlayed ? 'challenge-card__btn--done' : ''}`} disabled={hasPlayed}>
                        {hasPlayed ? (
                          <>
                            Zdobyto <span className="challenge-card__score">{score || 0}</span><span className="challenge-card__score-limit">/1000 pkt</span>
                          </>
                        ) : 'Rozpocznij'}
                      </button>
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
