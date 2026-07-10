import { useState, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import TopNav from '../components/Navigation/TopNav';
import { fetchAllCloudProfiles, fetchDailyChallenges } from '../config/firebase';
import { AVATARS } from '../data/avatars';
import './Leaderboard.css';

export function Leaderboard() {
  const user = useUserProfile();
  const [view, setView] = useState('challenges'); // 'challenges' | 'where-is-street' | 'what-street'
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

        // Process challenges without hardcoded placeholders.
        const chList = cloudChallenges ? [...cloudChallenges] : [];
        // Sort challenges descending by date
        chList.sort((a, b) => b.date.localeCompare(a.date));
        setChallenges(chList);
      } catch (err) {
        console.warn('Error loading leaderboard data:', err);
        setIsOffline(true);
        setChallenges([]);
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

  const rankingTabs = [
    {
      id: 'challenges',
      title: 'Wyzwania',
      subtitle: 'Historia wyzwań i wyniki',
      headerSubtitle: 'Historia wyzwań i najlepsi gracze (najnowsze u góry)',
      icon: '/icons/ribbon.svg',
    },
    {
      id: 'where-is-street',
      title: 'Wskaż ulicę',
      subtitle: 'Umieść pinezkę nad tą ulicą',
      headerSubtitle: 'Najlepsi w lokalizowaniu ulic na mapie',
      icon: '/icons/umiesc.svg',
    },
    {
      id: 'what-street',
      title: 'Nazwij ulicę',
      subtitle: 'Nazwij podświetloną ulicę',
      headerSubtitle: 'Najlepsi w podawaniu nazw podświetlonych ulic',
      icon: '/icons/nazwij.svg',
    },
  ];

  const activeRanking = rankingTabs.find(tab => tab.id === view) || rankingTabs[0];

  const renderChallengesView = () => {
    return (
      <div className="leaderboard-challenges-container animate-fade-in">
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
              <div key={ch.id} className="glass-card challenge-rank-card">
                <div className="challenge-rank-card__header">
                  <div className="challenge-rank-card__title-group">
                    <div className="challenge-rank-card__copy">
                      <h4 className="challenge-rank-card__title">{ch.title}</h4>
                      <p className="challenge-rank-card__desc">{ch.description}</p>
                    </div>
                  </div>
                  <div className="challenge-rank-card__date">
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
                      {ch.date}
                    </span>
                  </div>
                </div>

                {ranks.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '12px' }}>Nikt jeszcze nie ukończył tego wyzwania. Bądź pierwszy!</p>
                ) : (
                  <table className="clean-leaderboard-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th className="challenge-rank-card__rank-col" style={{ width: '45px' }}>Poz.</th>
                        <th>Gracz</th>
                        <th style={{ width: '70px', textAlign: 'right', color: 'var(--green-primary)' }}>Pkt</th>
                        <th className="challenge-rank-card__max-col" style={{ width: '60px', textAlign: 'right' }}>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranks.map((row, idx) => {
                        const isSelf = user.email && row.email?.toLowerCase().trim() === user.email.toLowerCase().trim();
                        const isCustom = row.avatarId === 'custom' && row.customAvatar;
                        const avatarImg = isCustom ? row.customAvatar : (AVATARS.find(a => a.id === row.avatarId)?.image);
                        const displayedEmail = row.hideEmail ? 'mail ukryty' : row.email;
                        return (
                          <tr key={idx} className={isSelf ? 'leaderboard-row--current-user' : ''} style={{ background: isSelf ? 'rgba(22, 163, 74, 0.08)' : 'transparent' }}>
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
                                    {row.name}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayedEmail}
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

  const renderModeView = (mode) => {
    const list = getProcessedListForFilter(mode);
    return (
      <div className="leaderboard-mode-container animate-fade-in">
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
                  const displayedEmail = item.hideEmail ? 'mail ukryty' : item.email;

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
                            </span>
                            <span className="player-email">
                              {displayedEmail}
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

        <header className="leaderboard-header leaderboard-header--top">
          <h1 className="leaderboard-title hero__title text-display">Ranking</h1>
        </header>

        <div className="leaderboard-menu-grid leaderboard-tabs-chooser" role="tablist" aria-label="Kategorie rankingu">
          {rankingTabs.map(tab => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`leaderboard-menu-card leaderboard-tab-card ${isActive ? 'leaderboard-menu-card--active' : ''}`}
                onClick={() => setView(tab.id)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="leaderboard-menu-card__icon svg-icon" style={{ '--icon': `url(${tab.icon})` }} aria-hidden="true" />
                <span className="leaderboard-menu-card__title">{tab.title}</span>
                <span className="leaderboard-menu-card__subtitle">{tab.subtitle}</span>
              </button>
            );
          })}
        </div>

        <header className="leaderboard-header leaderboard-header--subtitle">
          <p className="leaderboard-subtitle">{activeRanking.headerSubtitle}</p>
        </header>

        {view === 'challenges' && renderChallengesView()}
        {view === 'where-is-street' && renderModeView('where-is-street')}
        {view === 'what-street' && renderModeView('what-street')}
      </main>
    </div>
  );
}

export default Leaderboard;
