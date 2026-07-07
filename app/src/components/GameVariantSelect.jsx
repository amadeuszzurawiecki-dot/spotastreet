import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from './Navigation/TopNav';
import './GameVariantSelect.css';

function GameVariantSelect({ gameTitle, gameIcon, onSelectVariant, onBack }) {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [selectedMainOption, setSelectedMainOption] = useState(null); // null | 'training' | 'ai'
  const [rounds, setRounds] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);

  const modeInfo = {
    pin: {
      icon: '/icons/umiesc.svg',
      title: 'Wskaż ulicę',
      description: 'Umieść pinezkę nad tą ulicą',
    },
    scan: {
      icon: '/icons/nazwij.svg',
      title: 'Nazwij ulicę',
      description: 'Nazwij podświetloną ulicę',
    },
    target: {
      icon: '/icons/flag.svg',
      title: gameTitle,
      description: 'Znajdź wskazane miejsce na mapie',
    },
  }[gameIcon] || {
    icon: '/icons/play.svg',
    title: gameTitle,
    description: 'Wybierz wariant rozgrywki',
  };

  const handleStartTraining = () => {
    onSelectVariant({
      variant: 'training',
      rounds: Number(rounds),
      timeLimit: Number(timeLimit)
    });
  };

  const handleStartAi = () => {
    onSelectVariant({
      variant: 'ai',
      rounds: 10, // AI matches standard 10 rounds
      timeLimit: 15 // standard time
    });
  };

  const handleStartMultiplayer = () => {
    if (!user.isPremium) {
      if (window.confirm("Pojedynek 1v1 na żywo jest dostępny tylko dla użytkowników Premium. Czy chcesz przejść do profilu, aby aktywować Premium?")) {
        navigate('/profile');
      }
      return;
    }
    onSelectVariant({ variant: 'multiplayer' });
  };

  if (selectedMainOption === 'training') {
    return (
      <>
        <TopNav />
        <div className="variant-select-container animate-fade-in">
          <div className="variant-select-glow" />
        
        <header className="variant-select-header">
          <div className="variant-select-header__badge">KONFIGURATOR ROZGRYWKI</div>
          <h1 className="variant-select-header__title text-display">
            TRYB TRENINGOWY
          </h1>
          <p className="variant-select-header__subtitle">
            Dostosuj parametry sesji treningowej. Twoje punkty nie wpływają na bilans pojedynków.
          </p>
        </header>

        <div className="config-form glass-card animate-scale-in">
          <div className="config-group">
            <label className="config-label">Liczba rund: <span className="config-val">{rounds}</span></label>
            <div className="config-options">
              {[5, 8, 10, 15, 20].map((r) => (
                <button 
                  key={r} 
                  type="button" 
                  className={`config-opt-btn ${rounds === r ? 'config-opt-btn--active' : ''}`}
                  onClick={() => setRounds(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="config-group" style={{ marginTop: '20px' }}>
            <label className="config-label">Czas na rundę: <span className="config-val">{timeLimit}s</span></label>
            <div className="config-options">
              {[5, 10, 15, 20, 30].map((t) => (
                <button 
                  key={t} 
                  type="button" 
                  className={`config-opt-btn ${timeLimit === t ? 'config-opt-btn--active' : ''}`}
                  onClick={() => setTimeLimit(t)}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

        <button type="button" className="btn-primary start-btn" onClick={handleStartTraining} style={{ marginTop: '30px', width: '100%' }}>
          Uruchom trening
        </button>
        </div>

        <button type="button" className="btn-secondary back-btn-variant" onClick={() => setSelectedMainOption(null)}>
          Wróć do wariantów
        </button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div className="variant-select-container animate-fade-in">
        <div className="variant-select-glow" />
      
      <header className="variant-select-header">
        <h1 className="variant-select-header__title text-display">
          WYBIERZ WARIANT GRY
        </h1>
        <div className="mode-card mode-card--static variant-select-header__mode-card">
          <span className="mode-card__icon-wrap" aria-hidden="true">
            <span className="svg-icon mode-card__svg" style={{ '--icon': `url(${modeInfo.icon})` }} />
          </span>
          <div className="mode-card__content">
            <h3 className="mode-card__title">{modeInfo.title}</h3>
            <p className="mode-card__desc">{modeInfo.description}</p>
          </div>
        </div>
      </header>

      <div className="variant-grid animate-scale-in">
        {/* Trening */}
        <button type="button" className="variant-card" onClick={() => setSelectedMainOption('training')}>
          <span className="variant-card__icon svg-icon" style={{ '--icon': 'url(/icons/trening.svg)' }} aria-hidden="true" />
          <span>
            <h3 className="variant-card__title">Trening</h3>
            <p className="variant-card__desc">Ustaw i ćwicz</p>
          </span>
        </button>

        {/* Walka z AI */}
        <button type="button" className="variant-card" onClick={handleStartAi}>
          <span className="variant-card__icon svg-icon" style={{ '--icon': 'url(/icons/funny.svg)' }} aria-hidden="true" />
          <span>
            <h3 className="variant-card__title">Walka z AI</h3>
            <p className="variant-card__desc">Pokonaj bota</p>
          </span>
        </button>

        {/* Pojedynek */}
        <button 
          type="button"
          className="variant-card" 
          onClick={handleStartMultiplayer}
        >
          <span className="variant-card__icon svg-icon" style={{ '--icon': 'url(/icons/pojedynek.svg)' }} aria-hidden="true" />
          <span>
            <h3 className="variant-card__title">Pojedynek</h3>
            <p className="variant-card__desc">Rywalizacja 1v1 online</p>
          </span>
          {!user.isPremium && <div className="variant-card__lock-badge">PREMIUM</div>}
        </button>
      </div>

      <button type="button" className="btn-secondary back-btn-variant" onClick={onBack}>
        Wróć do menu
      </button>
      </div>
    </>
  );
}

export default GameVariantSelect;
