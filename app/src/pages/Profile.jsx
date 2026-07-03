import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from '../components/Navigation/TopNav';
import { AVATARS } from '../data/avatars';
import { TOWNS } from '../data/towns';
import { isAdminEmail } from '../config/admin';
import './Profile.css';

export function Profile() {
  const user = useUserProfile();
  const navigate = useNavigate();
  
  // Form state
  const [name, setName] = useState(user.name);
  const [town, setTown] = useState(user.town);
  const [avatarId, setAvatarId] = useState(user.avatarId);
  const [hideEmail, setHideEmail] = useState(user.hideEmail || false);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const selectedAvatar = avatarId === 'custom' 
    ? { id: 'custom', image: user.customAvatar || '/avatars/amadi.png', emoji: '👤', name: 'Własne', bg: 'transparent' }
    : (AVATARS.find(a => a.id === avatarId) || AVATARS[0]);

  const handleSave = () => {
    user.updateProfile({
      name,
      town: town || 'Legnica',
      avatarId,
      hideEmail,
    });
    setMessage('Zmiany zostały zapisane! ✓');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 160; // 160x160 px is optimal for quality/size ratio
        let width = img.width;
        let height = img.height;

        // Crop to square and resize
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

        const base64 = canvas.toDataURL('image/jpeg', 0.7); // Tiny footprint base64 JPEG
        user.updateProfile({
          customAvatar: base64,
          avatarId: 'custom'
        });
        setAvatarId('custom');
        setMessage('Zdjęcie profilowe zostało wgrane! ✓');
        setTimeout(() => setMessage(''), 3000);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Calculate total wins
  const totalWins = 
    (user.stats?.['where-is-street']?.wins || 0) +
    (user.stats?.['where-is-place']?.wins || 0) +
    (user.stats?.['what-street']?.wins || 0);

  return (
    <div className="profile-page">
      {/* Redesigned top navbar */}
      <TopNav />

      <main className="profile-container">
        {/* Profile Card Header */}
        <section className="profile-card-header glass-card">
          <div 
            className={`profile-card-header__avatar ${user.isPremium ? 'premium-glow-avatar' : ''}`} 
            style={{ backgroundColor: selectedAvatar.bg }}
          >
            {selectedAvatar.image ? (
              <img src={selectedAvatar.image} alt={selectedAvatar.name} />
            ) : (
              selectedAvatar.emoji
            )}
          </div>
          <div className="profile-card-header__details">
            <h2 className="profile-card-header__name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {name || 'Kierowca'}
              {user.isPremium && <span className="premium-badge-text">⚡ PREMIUM</span>}
            </h2>
            <span className="profile-card-header__town" style={{ opacity: 0.7, wordBreak: 'break-all' }}>{user.email || 'kierowca@gmail.com'}</span>
          </div>
        </section>

        {/* Premium Upgrade Card */}
        <section className="profile-premium-card glass-card">
          <h3 className="profile-section-title">Status Konta</h3>
          {user.isPremium ? (
            <div className="premium-status-box premium-status-box--active">
              <div className="premium-status-box__badge">⚡ PREMIUM AKTYWNE</div>
              <p className="premium-status-box__desc">Cieszysz się nielimitowanymi grami singleplayer oraz dostępem do pojedynków 1v1 na żywo! Twoja nazwa w rankingu ma unikalną poświatę.</p>
              {isAdminEmail(user.email) ? (
                <button className="btn-secondary premium-cancel-btn" onClick={() => {
                  if (window.confirm("Czy na pewno chcesz anulować subskrypcję Premium (Symulacja)?")) {
                    user.updateProfile({ isPremium: false });
                  }
                }}>
                  Anuluj subskrypcję (Symulacja)
                </button>
              ) : (
                <p className="premium-status-box__desc" style={{ fontStyle: 'italic', opacity: 0.7, marginTop: '8px' }}>
                  Dostęp Premium zarządzany przez Administratora.
                </p>
              )}
            </div>
          ) : (
            <div className="premium-status-box premium-status-box--free">
              <div className="premium-status-box__badge">DARMOWE KONTO</div>
              <p className="premium-status-box__desc">Konta bezpłatne mają limit 3 gier jednoosobowych dziennie oraz nie posiadają dostępu do pojedynków 1v1 na żywo. Odblokuj pełen dostęp!</p>
              {isAdminEmail(user.email) ? (
                <button className="btn-primary premium-buy-btn" onClick={() => setShowCheckout(true)}>
                  ⚡ Aktywuj Premium (Symulacja)
                </button>
              ) : (
                <p className="premium-status-box__desc" style={{ fontStyle: 'italic', opacity: 0.7, marginTop: '8px' }}>
                  Aktywacja konta Premium jest możliwa wyłącznie przez Administratora.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Profile Edit Settings */}
        <section className="profile-settings glass-card">
          <h3 className="profile-section-title">Ustawienia Profilu</h3>
          
          {message && <div className="profile-settings__message">{message}</div>}

          <div className="form-group">
            <label className="form-label">Imię / Nick</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="Twój nick..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Miejscowość</label>
            <input 
              type="text" 
              list="towns-list"
              className="form-input" 
              value={town} 
              onChange={e => setTown(e.target.value)}
              placeholder="Legnica..."
            />
            <datalist id="towns-list">
              {TOWNS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          {/* Clean circle avatar selection */}
          <div className="form-group">
            <label className="form-label">Wybierz avatar</label>
            <div className="clean-avatar-grid">
              {/* Render custom upload button as the first option if it exists */}
              {user.customAvatar && (
                <button
                  key="custom"
                  className={`clean-avatar-card ${avatarId === 'custom' ? 'clean-avatar-card--selected' : ''}`}
                  onClick={() => setAvatarId('custom')}
                  style={{ backgroundColor: 'transparent' }}
                  title="Własne zdjęcie"
                >
                  <img src={user.customAvatar} alt="Własne" className="clean-avatar-card__img" />
                </button>
              )}

              {AVATARS.map(avatar => (
                <button
                  key={avatar.id}
                  className={`clean-avatar-card ${avatarId === avatar.id ? 'clean-avatar-card--selected' : ''}`}
                  onClick={() => setAvatarId(avatar.id)}
                  style={{ backgroundColor: avatar.bg }}
                  title={avatar.name}
                >
                  {avatar.image ? (
                    <img src={avatar.image} alt="Avatar" className="clean-avatar-card__img" />
                  ) : (
                    <span className="clean-avatar-card__emoji">{avatar.emoji}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '4px' }}>
            <label className="form-label">Ustaw własne zdjęcie profilowe</label>
            <input 
              type="file" 
              id="profile-image-file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: 'none' }}
            />
            <label htmlFor="profile-image-file" className="btn-secondary" style={{ display: 'inline-flex', width: 'auto', padding: '10px 18px', fontSize: '0.85rem', cursor: 'pointer', justifySelf: 'flex-start' }}>
              📁 Wybierz plik obrazu
            </label>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="profile-hide-email"
              checked={hideEmail}
              onChange={e => setHideEmail(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="profile-hide-email" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              Ukryj mój adres e-mail w rankingu
            </label>
          </div>

          <button className="btn-primary profile-save-btn" onClick={handleSave}>
            Zapisz zmiany
          </button>
        </section>

        {/* Profile Statistics */}
        <section className="profile-stats-section glass-card">
          <h3 className="profile-section-title">Statystyki Gier</h3>
          
          <div className="stats-list">
            <div className="stats-item">
              <span className="stats-item__icon">⛳</span>
              <div className="stats-item__info">
                <div className="stats-item__title">Gdzie jest ta ulica?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['where-is-street']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['where-is-street']?.losses || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="stats-item">
              <span className="stats-item__icon">🏰</span>
              <div className="stats-item__info">
                <div className="stats-item__title">Gdzie jest to miejsce?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['where-is-place']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['where-is-place']?.losses || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon">🔍</span>
              <div className="stats-item__info">
                <div className="stats-item__title">Co to za ulica?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['what-street']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['what-street']?.losses || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon">⚔️</span>
              <div className="stats-item__info">
                <div className="stats-item__title">Pojedynki online (1v1)</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.onlineWins || 0}</span> / Przegrane: <span className="stats-loss">{user.onlineLosses || 0}</span> / Remisy: <span className="stats-draw" style={{ color: 'var(--text-tertiary)' }}>{user.onlineDraws || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon">🏆</span>
              <div className="stats-item__info">
                <div className="stats-item__title">Ukończone wyzwania</div>
                <div className="stats-item__val">
                  Wykonano wyzwań: <strong style={{ color: 'var(--green-primary)' }}>{Object.keys(user.challengeAttempts || {}).length}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Payment checkout modal (Simulation) */}
      {showCheckout && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal-card glass-card animate-scale-in">
            <h3 className="checkout-modal-title">⚡ Odblokuj SPOTASTREET PREMIUM</h3>
            <p className="checkout-modal-desc">Zyskaj nielimitowane gry singleplayer, tryb multiplayer 1v1 oraz świecącą ramkę w rankingu.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setIsPaying(true);
              setTimeout(() => {
                user.updateProfile({ isPremium: true });
                setIsPaying(false);
                setShowCheckout(false);
              }, 1500);
            }} className="checkout-form">
              <div className="form-group">
                <label className="form-label">Numer Karty (Symulacja)</label>
                <input required type="text" placeholder="4000 1234 5678 9010" className="form-input" defaultValue="4242 4242 4242 4242" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Ważność</label>
                  <input required type="text" placeholder="MM/RR" className="form-input" defaultValue="12/28" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">CVV</label>
                  <input required type="password" placeholder="123" className="form-input" defaultValue="123" />
                </div>
              </div>
              
              <div className="checkout-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCheckout(false)}>Anuluj</button>
                <button type="submit" className="btn-primary" disabled={isPaying}>
                  {isPaying ? 'Przetwarzanie płatności...' : 'Zapłać i aktywuj Premium (0 PLN)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
