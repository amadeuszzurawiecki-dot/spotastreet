import { useState, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from '../components/Navigation/TopNav';
import { fetchAllCloudProfiles, fetchDailyChallenges } from '../config/firebase';
import { AVATARS } from '../data/avatars';
import { maskEmail } from '../utils/privacy';
import './Leaderboard.css';

export function Leaderboard() {
  const user = useUserProfile();
  const [view, setView] = useState('menu'); // 'menu' | 'challenges' | 'where-is-street' | 'where-is-place' | 'what-street'
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cloudProfiles, cloudChallenges] = await Promise.all([
          fetchAllCloudProfiles(),
          fetchDailyChallenges()
        ]);
        
        if (cloudProfiles === null || cloudChallenges === null) {
          setIsOffline(true);
        }

        let combined = cloudProfiles ? [...cloudProfiles] : [];

        // Always merge the current active user
        if (user.email) {
          const userKey = user.email.toLowerCase().trim();
          const existingIdx = combined.findIndex(p => p.email?.toLowerCase().trim() === userKey);
          
          const currentUserData = {
            email: user.email,
            name: user.name,
            town: user.town,
            avatarId: user.avatarId,
            stats: user.stats || {},
            challengeAttempts: user.challengeAttempts || {},
            isPremium: user.isPremium || false,
            customAvatar: user.customAvatar || null,
            hideEmail: user.hideEmail || false
          };

          if (existingIdx !== -1) {
            combined[existingIdx] = {
              ...combined[existingIdx],
              ...currentUserData,
              stats: {
                ...combined[existingIdx].stats,
                ...currentUserData.stats
              },
              challengeAttempts: {
                ...combined[existingIdx].challengeAttempts,
                ...currentUserData.challengeAttempts
              }
            };
          } else {
            combined.push(currentUserData);
          }
        }
        setLeaderboard(combined);

        // Process challenges
        let chList = cloudChallenges ? [...cloudChallenges] : [];
        if (chList.length === 0) {
          const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
          chList = [
            {
              id: 'default_cudow',
              title: 'Znawca Dzielnicy Cudów',
              description: 'Rozpoznaj słynne patusiarskie ulice',
              icon: 'scan',
              rounds: 15,
              timeLimit: 15,
              gameMode: 'what-street',
              date: todayStr
            },
            {
              id: 'default_sienkiewicza',
              title: 'Ekspert z Osiedla Sienkiewicza',
              description: 'Henryk byłby dumny',
              icon: 'pin',
              rounds: 15,
              timeLimit: 15,
              gameMode: 'where-is-street',
              date: todayStr
            }
          ];
        }
        // Sort challenges descending by date
        chList.sort((a, b) => b.date.localeCompare(a.date));
        setChallenges(chList);
      } catch (err) {
        console.warn('Error loading leaderboard data:', err);
        setIsOffline(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.email, user.name, user.town, user.avatarId, user.stats, user.challengeAttempts, user.isPremium, user.customAvatar, user.hideEmail]);

  const getProcessedListForFilter = (mode) => {
    return leaderboard
      .map(p => {
        const wins = p.stats?.[mode]?.wins || 0;
        const losses = p.stats?.[mode]?.losses || 0;
        const matches = wins + losses;
        return { ...p, wins, losses, matches };
      })
      .filter(p => p.wins > 0)
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, 'pl'))
      .slice(0, 10);
  };

  const renderChallengesView = () => {
    return (
      <div className="leaderboard-challenges-container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <button className="btn-secondary leaderboard-back-btn" onClick={() => setView('menu')}>
            ‹ Powrót do wyboru rankingu
          </button>
        </div>

        <header className="leaderboard-header" style={{ marginBottom: '24px' }}>
          <h2 className="leaderboard-title text-display">Ranking Wyzwań Codziennych</h2>
          <p className="leaderboard-subtitle">Historia wyzwań i najlepsi gracze (najnowsze u góry)</p>
        </header>
        
        {challenges.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '24px' }}>Brak zapisanych wyzwań.</p>
        ) : (
          challenges.map(ch => {
            const ranks = [];
            leaderboard.forEach(p => {
              const attempts = p.challengeAttempts || {};
              const score = attempts[ch.id];
              if (score !== undefined) {
                 ranks.push({
                   name: p.name || 'Kierowca',
                   email: p.email,
                   avatarId: p.avatarId,
                   score: score,
                   hideEmail: p.hideEmail || false,
                   isPremium: p.isPremium || false,
                   customAvatar: p.customAvatar || null
                 });
              }
            });
            ranks.sort((a, b) => b.score - a.score);

            return (
              <div key={ch.id} className="glass-card challenge-rank-card" style={{ padding: '20px', marginBottom: '20px', borderRadius: '4px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`line-icon line-icon--${ch.icon || 'target'}`} aria-hidden="true" />
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--green-primary)' }}>{ch.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{ch.description}</p>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
                      {ch.date}
                    </span>
                  </div>
                </div>

                {ranks.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '8px 0' }}>Nikt jeszcze nie ukończył tego wyzwania. Bądź pierwszy!</p>
                ) : (
                  <table className="clean-leaderboard-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>Poz.</th>
                        <th>Gracz</th>
                        <th style={{ width: '70px', textAlign: 'right', color: 'var(--green-primary)' }}>Pkt</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranks.map((row, idx) => {
                        const isSelf = user.email && row.email?.toLowerCase().trim() === user.email.toLowerCase().trim();
                        const isCustom = row.avatarId === 'custom' && row.customAvatar;
                        const avatarImg = isCustom ? row.customAvatar : (AVATARS.find(a => a.id === row.avatarId)?.image);
                        return (
                          <tr key={idx} className={isSelf ? 'leaderboard-row--current-user' : ''} style={{ background: isSelf ? 'rgba(0, 230, 118, 0.08)' : 'transparent' }}>
                            <td style={{ fontWeight: '700' }}>
                              {idx + 1}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div 
                                  className={`leaderboard-avatar-wrapper ${row.isPremium ? 'premium-glow-avatar' : ''}`}
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}
                                >
                                  {avatarImg ? (
                                    <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <span className="line-icon line-icon--user" aria-hidden="true" />
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {row.name} {isSelf && <span className="player-you-tag" style={{ fontSize: '0.6rem' }}>Ty</span>}
                                    {row.isPremium && <span className="player-you-tag">Premium</span>}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {maskEmail(row.email)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--green-primary)', whiteSpace: 'nowrap' }}>{row.score}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{(ch.rounds || 15) * 100}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderModeView = (mode, title, subtitle) => {
    const list = getProcessedListForFilter(mode);
    return (
      <div className="leaderboard-mode-container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <button className="btn-secondary leaderboard-back-btn" onClick={() => setView('menu')}>
            ‹ Powrót do wyboru rankingu
          </button>
        </div>

        <header className="leaderboard-header">
          <h2 className="leaderboard-title text-display">{title}</h2>
          <p className="leaderboard-subtitle">{subtitle}</p>
        </header>

        <div className="leaderboard-table-card glass-card">
          {loading ? (
            <div className="leaderboard-loading">
              <div className="leaderboard-loading__spinner" />
              <p>Pobieranie tabeli wyników z Legnicy...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="leaderboard-empty">
              <p>Brak wyników w tym trybie. Bądź pierwszym bolciarze z punktami!</p>
            </div>
          ) : (
            <table className="clean-leaderboard-table">
              <thead>
                <tr>
                  <th className="col-rank">Poz.</th>
                  <th className="col-player">Gracz</th>
                  <th className="col-val col-w">W</th>
                  <th className="col-val col-l">L</th>
                  <th className="col-val col-m">M</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, idx) => {
                  const isCurrentUser = user.email && item.email?.toLowerCase().trim() === user.email.toLowerCase().trim();
                  const isCustom = item.avatarId === 'custom' && item.customAvatar;
                  const avatarImg = isCustom ? item.customAvatar : (AVATARS.find(a => a.id === item.avatarId)?.image);

                  return (
                    <tr 
                      key={item.email || idx} 
                      className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row--current-user' : ''}`}
                    >
                      <td className={`cell-rank cell-rank--${idx + 1}`}>
                        {idx + 1}
                      </td>

                      <td className="cell-player">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            className={`leaderboard-avatar-circle ${item.isPremium ? 'premium-glow-avatar' : ''}`} 
                            style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            {avatarImg ? (
                              <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span className="line-icon line-icon--user" aria-hidden="true" />
                            )}
                          </div>
                          <div className="player-details" style={{ minWidth: 0, flex: 1 }}>
                            <span className="player-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {item.name}
                              {isCurrentUser && <span className="player-you-tag">Ty</span>}
                              {item.isPremium && <span className="player-you-tag">Premium</span>}
                            </span>
                            <span className="player-email">
                              {maskEmail(item.email)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="cell-val cell-w">{item.wins}</td>
                      <td className="cell-val cell-l">{item.losses}</td>
                      <td className="cell-val cell-m">{item.matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="leaderboard-page">
      <TopNav />

      <main className="leaderboard-container">
        {isOffline && (
          <div className="offline-banner" style={{ marginBottom: '20px' }}>
            <span className="offline-banner__icon line-icon line-icon--alert" aria-hidden="true" />
            <div>
              <strong>Brak odpowiedzi z bazy chmurowej:</strong> Działasz w trybie offline. Dane rankingu są ładowane lokalnie.
            </div>
          </div>
        )}

        {view === 'menu' && (
          <div className="leaderboard-menu-container animate-fade-in">
            <header className="leaderboard-header">
          <h2 className="leaderboard-title text-display">Rankingi Legnicy</h2>
              <p className="leaderboard-subtitle">Wybierz kategorię, aby zobaczyć najlepszych kierowców</p>
            </header>

            <div className="leaderboard-menu-grid">
              <div className="leaderboard-menu-card" onClick={() => setView('challenges')}>
                <span className="leaderboard-menu-card__icon line-icon line-icon--trophy" aria-hidden="true" />
                <span className="leaderboard-menu-card__title">Wyzwania codzienne</span>
                <span className="leaderboard-menu-card__subtitle">Historia wyzwań i wyniki</span>
              </div>

              <div className="leaderboard-menu-card" onClick={() => setView('where-is-street')}>
                <span className="leaderboard-menu-card__icon line-icon line-icon--pin" aria-hidden="true" />
                <span className="leaderboard-menu-card__title">Gdzie jest ta ulica?</span>
                <span className="leaderboard-menu-card__subtitle">Rozpoznawanie ulic na mapie</span>
              </div>

              <div className="leaderboard-menu-card" onClick={() => setView('where-is-place')}>
                <span className="leaderboard-menu-card__icon line-icon line-icon--target" aria-hidden="true" />
                <span className="leaderboard-menu-card__title">Gdzie jest to miejsce?</span>
                <span className="leaderboard-menu-card__subtitle">Rozpoznawanie zabytków i punktów</span>
              </div>

              <div className="leaderboard-menu-card" onClick={() => setView('what-street')}>
                <span className="leaderboard-menu-card__icon line-icon line-icon--scan" aria-hidden="true" />
                <span className="leaderboard-menu-card__title">Co to za ulica?</span>
                <span className="leaderboard-menu-card__subtitle">Nazywanie podświetlonych ulic</span>
              </div>
            </div>
          </div>
        )}

        {view === 'challenges' && renderChallengesView()}
        {view === 'where-is-street' && renderModeView('where-is-street', 'Gdzie jest ta ulica?', 'Najlepsi w lokalizowaniu ulic na mapie')}
        {view === 'where-is-place' && renderModeView('where-is-place', 'Gdzie jest to miejsce?', 'Najlepsi w lokalizowaniu punktów i zabytków')}
        {view === 'what-street' && renderModeView('what-street', 'Co to za ulica?', 'Najlepsi w podawaniu nazw podświetlonych ulic')}
      </main>
    </div>
  );
}

export default Leaderboard;
