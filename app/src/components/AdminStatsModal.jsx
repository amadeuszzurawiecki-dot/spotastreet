import { useState, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import { fetchAllCloudProfiles } from '../config/firebase';
import CarBadge from './CarBadge';
import { maskEmail } from '../utils/privacy';
import './AdminStatsModal.css';

export function AdminStatsModal({ onClose }) {
  const user = useUserProfile();
  const [cloudProfiles, setCloudProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const profiles = await fetchAllCloudProfiles();
      setCloudProfiles(profiles);
      setLoading(false);
    }
    loadStats();
  }, []);

  const localSaved = Object.values(user.savedProfiles || {}).filter(p => p.hasCompletedProfile || p.name);
  
  // Combine cloud profiles and local profiles without duplicates
  const profileMap = {};
  [...cloudProfiles, ...localSaved].forEach(p => {
    if (p.email || p.name) {
      const key = (p.email || p.name).toLowerCase();
      profileMap[key] = {
        name: p.name || 'Gracz',
        email: p.email || 'Konto Google',
        town: p.town || 'Legnica',
        car: p.car || user.car,
      };
    }
  });

  // Fallback to active user if empty
  if (Object.keys(profileMap).length === 0 && user.name) {
    profileMap[user.name.toLowerCase()] = {
      name: user.name,
      email: user.email || 'Twój e-mail Google',
      town: user.town || 'Legnica',
      car: user.car,
    };
  }

  const combinedList = Object.values(profileMap);

  // Calculate statistics
  const brandCounts = {};
  combinedList.forEach(p => {
    const brand = p.car?.brandName || 'Toyota';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  return (
    <div className="admin-stats-overlay animate-fade-in">
      <div className="admin-stats-modal glass-card animate-scale-in">
        
        {/* Header */}
        <div className="admin-stats__header">
          <div>
            <div className="admin-stats__badge">GLOBALNE STATYSTYKI SPOTASTREET</div>
            <h2 className="admin-stats__title text-display">Konta i Wybrane Auta</h2>
          </div>
          <button className="admin-stats__close" onClick={onClose} aria-label="Zamknij">
            <span className="line-icon line-icon--close" aria-hidden="true" />
          </button>
        </div>

        {/* Overview Cards */}
        <div className="admin-stats__cards-grid">
          <div className="admin-card">
            <span className="admin-card__num">{combinedList.length}</span>
            <span className="admin-card__label">Wszystkie Konta</span>
          </div>
          <div className="admin-card">
            <span className="admin-card__num">{Object.keys(brandCounts).length || 1}</span>
            <span className="admin-card__label">Różne Marki Aut</span>
          </div>
          <div className="admin-card">
            <span className="admin-card__num">Global</span>
            <span className="admin-card__label">Status Chmury</span>
          </div>
        </div>

        {/* Players & Cars Table */}
        <div className="admin-stats__section-title">
          Lista Zarejestrowanych Kierowców ({combinedList.length}):
        </div>
        
        <div className="admin-stats__table-container">
          {loading ? (
            <div className="admin-stats__loading">Pobieranie wszystkich kont z bazy chmurowej...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kierowca</th>
                  <th>Miejscowość</th>
                  <th>Wybrane Auto Bolt</th>
                </tr>
              </thead>
              <tbody>
                {combinedList.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="admin-table__user">
                        <span className="admin-table__avatar line-icon line-icon--user" aria-hidden="true" />
                        <div>
                          <div className="admin-table__name">{p.name}</div>
                          <div className="admin-table__email">{maskEmail(p.email)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.town}</td>
                    <td>
                      <CarBadge car={p.car} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-stats__footer">
          <button className="btn-primary" onClick={onClose}>Zamknij panel</button>
        </div>

      </div>
    </div>
  );
}

export default AdminStatsModal;
