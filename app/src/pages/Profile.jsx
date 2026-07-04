import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from '../components/Navigation/TopNav';
import { AVATARS } from '../data/avatars';
import { TOWNS } from '../data/towns';
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

  const selectedAvatar = avatarId === 'custom' 
    ? { id: 'custom', image: user.customAvatar || null, name: 'Własne', bg: 'transparent' }
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
              <span className="line-icon line-icon--user" aria-hidden="true" />
            )}
          </div>
          <div className="profile-card-header__details">
            <h2 className="profile-card-header__name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {name || 'Kierowca'}
              {user.isPremium && <span className="premium-badge-text">PREMIUM</span>}
              {!user.isPremium && <span className="free-badge-text">FREE</span>}
            </h2>
            <span className="profile-card-header__town" style={{ opacity: 0.7, wordBreak: 'break-all' }}>{user.email || 'kierowca@gmail.com'}</span>
            <label className="profile-hide-email-inline" htmlFor="profile-hide-email">
              <input 
                type="checkbox" 
                id="profile-hide-email"
                checked={hideEmail}
                onChange={e => setHideEmail(e.target.checked)}
              />
              <span>Ukryj mój adres e-mail w rankingu</span>
            </label>
          </div>
        </section>

        {/* Profile Edit Settings */}
        <section className="profile-settings glass-card">
          <h3 className="profile-section-title">Ustawienia Profilu</h3>
          
          {message && <div className="profile-settings__message">{message}</div>}

          <div className="profile-form-row">
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
          </div>

          {/* Clean circle avatar selection */}
          <div className="form-group">
            <label className="form-label">Wybierz avatar</label>
            <input 
              type="file" 
              id="profile-image-file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: 'none' }}
            />
            <div className="clean-avatar-grid">
              <label
                htmlFor="profile-image-file"
                className={`clean-avatar-card clean-avatar-card--upload ${avatarId === 'custom' ? 'clean-avatar-card--selected' : ''}`}
                title="Własne zdjęcie"
              >
                {user.customAvatar ? (
                  <img src={user.customAvatar} alt="Własne" className="clean-avatar-card__img" />
                ) : (
                  <span className="line-icon line-icon--camera" aria-hidden="true" />
                )}
              </label>

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
                    <span className="line-icon line-icon--user" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
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
              <span className="stats-item__icon line-icon line-icon--pin" aria-hidden="true" />
              <div className="stats-item__info">
                <div className="stats-item__title">Gdzie jest ta ulica?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['where-is-street']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['where-is-street']?.losses || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="stats-item">
              <span className="stats-item__icon line-icon line-icon--target" aria-hidden="true" />
              <div className="stats-item__info">
                <div className="stats-item__title">Gdzie jest to miejsce?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['where-is-place']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['where-is-place']?.losses || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon line-icon line-icon--scan" aria-hidden="true" />
              <div className="stats-item__info">
                <div className="stats-item__title">Co to za ulica?</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.stats?.['what-street']?.wins || 0}</span> / Przegrane: <span className="stats-loss">{user.stats?.['what-street']?.losses || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon line-icon line-icon--ranking" aria-hidden="true" />
              <div className="stats-item__info">
                <div className="stats-item__title">Pojedynki online (1v1)</div>
                <div className="stats-item__val">
                  Wygrane: <span className="stats-win">{user.onlineWins || 0}</span> / Przegrane: <span className="stats-loss">{user.onlineLosses || 0}</span> / Remisy: <span className="stats-draw" style={{ color: 'var(--text-tertiary)' }}>{user.onlineDraws || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-item">
              <span className="stats-item__icon line-icon line-icon--trophy" aria-hidden="true" />
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

    </div>
  );
}

export default Profile;
