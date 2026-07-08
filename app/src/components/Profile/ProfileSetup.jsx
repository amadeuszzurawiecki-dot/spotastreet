import { useState } from 'react';
import useUserProfile from '../../hooks/useUserProfile';
import { AVATARS } from '../../data/avatars';
import { CAR_BRANDS, CAR_COLORS } from '../../data/cars';
import { TOWNS } from '../../data/towns';
import './ProfileSetup.css';

export function ProfileSetup({ onComplete }) {
  const user = useUserProfile();
  const [step, setStep] = useState(1); // 1: Avatar, 2: Car, 3: Details

  // Profile Form State
  const initialGoogleName = user.googleUser?.name || user.googleUser?.displayName || user.name || 'Gracz';
  const firstName = initialGoogleName.split(' ')[0];
  const [name, setName] = useState(firstName);
  const [town, setTown] = useState(user.town || 'Legnica');
  const [avatarId, setAvatarId] = useState(user.avatarId || '01');
  const [hideEmail, setHideEmail] = useState(user.hideEmail || false);
  const [customAvatar, setCustomAvatar] = useState(user.customAvatar || null);

  // Car State
  const [brandId, setBrandId] = useState(user.car?.brandId || 'toyota');
  const [model, setModel] = useState(user.car?.model || 'Prius');
  const [colorId, setColorId] = useState(user.car?.colorId || 'white');

  const selectedBrand = CAR_BRANDS.find(b => b.id === brandId) || CAR_BRANDS[0];
  const selectedColor = CAR_COLORS.find(c => c.id === colorId) || CAR_COLORS[0];
  
  const handleFinish = () => {
    user.updateProfile({
      name: name || 'Gracz',
      town: town || 'Legnica',
      avatarId,
      hideEmail,
      customAvatar,
    });

    user.updateCar({
      brandId,
      brandName: selectedBrand.name,
      model,
      colorId,
      colorHex: selectedColor.hex,
      svg: selectedBrand.svg,
    });

    user.completeProfileSetup();
    onComplete?.();
  };

  const handleAbort = () => {
    user.logout();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 160; // 160x160 px JPEG
        let width = img.width;
        let height = img.height;

        const size = Math.min(width, height);
        canvas.width = maxSize;
        canvas.height = maxSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          (width - size) / 2,
          (height - size) / 2,
          size,
          size,
          0,
          0,
          maxSize,
          maxSize
        );

        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setCustomAvatar(base64);
        setAvatarId('custom');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="profile-setup-overlay animate-fade-in">
      <div className="profile-setup-container">
        
        {/* Powitanie nad divem */}
        <h1 className="setup-greeting text-display">
          Cześć, <span className="setup-greeting--accent">{firstName}</span>!
        </h1>

        {/* Prostokątny Div z całą treścią */}
        <div className="profile-setup-modal glass-card animate-scale-in">
          
          {/* Wskaźnik etapu */}
          <div className="setup-progress">
            <div className={`setup-progress-item ${step >= 1 ? 'setup-progress-item--active' : ''}`}>
              <span className="setup-progress-num">1</span>
              <span className="setup-progress-label">Avatar</span>
            </div>
            <div className="setup-progress-line" style={{ width: step >= 2 ? '100%' : '0%' }} />
            <div className={`setup-progress-item ${step >= 2 ? 'setup-progress-item--active' : ''}`}>
              <span className="setup-progress-num">2</span>
              <span className="setup-progress-label">Dane</span>
            </div>
          </div>

          {/* KROK 1: Avatar */}
          {step === 1 && (
            <div className="setup-body animate-fade-in">
              <h2 className="setup-title text-display">Wybierz swój Avatar</h2>
              <p className="setup-desc">Wybierz avatar Spotastreet lub wgraj własne zdjęcie:</p>
              
              <div className="setup-avatar-grid">
                {customAvatar && (
                  <button
                    key="custom"
                    className={`setup-avatar-card ${avatarId === 'custom' ? 'setup-avatar-card--selected' : ''}`}
                    onClick={() => setAvatarId('custom')}
                  >
                    <div className="setup-avatar-card__img-wrapper" style={{ backgroundColor: 'transparent' }}>
                      <img src={customAvatar} alt="Własne" className="setup-avatar-card__img" />
                    </div>
                  </button>
                )}

                {AVATARS.map(avatar => (
                  <button
                    key={avatar.id}
                    className={`setup-avatar-card ${avatarId === avatar.id ? 'setup-avatar-card--selected' : ''}`}
                    onClick={() => setAvatarId(avatar.id)}
                  >
                    <div className="setup-avatar-card__img-wrapper" style={{ backgroundColor: avatar.bg }}>
                      {avatar.image ? (
                        <img src={avatar.image} alt={avatar.id} className="setup-avatar-card__img" />
                      ) : (
                        <span className="line-icon line-icon--user" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="file" 
                  id="setup-image-upload" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }}
                />
                <label htmlFor="setup-image-upload" className="btn-secondary" style={{ width: 'auto', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Wgraj własne zdjęcie profilowe
                </label>
              </div>

              <button className="btn-primary btn-with-gap" style={{ marginTop: '24px' }} onClick={() => setStep(2)}>
                Przejdźmy do danych &nbsp; →
              </button>
            </div>
          )}

          {/* KROK 2: Dane */}
          {step === 2 && (
            <div className="setup-body animate-fade-in">
              <h2 className="setup-title text-display">Ostatnie szczegóły</h2>
              <p className="setup-desc">Sprawdź swoje dane widoczne dla innych graczy:</p>

              <div className="form-group">
                <label className="form-label">Imię</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="Twoje imię..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Miejscowość</label>
                <input 
                  type="text" 
                  list="setup-towns-list"
                  className="form-input" 
                  value={town} 
                  onChange={e => setTown(e.target.value)}
                  placeholder="Legnica..."
                />
                <datalist id="setup-towns-list">
                  {TOWNS.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  id="hide-email-checkbox"
                  checked={hideEmail}
                  onChange={e => setHideEmail(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="hide-email-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Ukryj mój adres e-mail w rankingu
                </label>
              </div>

              <div className="setup-actions">
                <button className="btn-secondary btn-with-gap" onClick={() => setStep(1)}>← &nbsp; Wstecz</button>
                <button className="btn-primary" onClick={handleFinish}>Jazda!</button>
              </div>
            </div>
          )}

        </div>

        {/* Przycisk pod divem - Przerwanie procesu */}
        <button className="setup-abort-btn" onClick={handleAbort}>
          ← Przerwij rejestrację i wróć do ekranu powitalnego
        </button>

      </div>
    </div>
  );
}

export default ProfileSetup;
