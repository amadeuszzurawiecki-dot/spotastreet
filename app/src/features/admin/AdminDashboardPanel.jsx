import { useEffect, useMemo, useState } from 'react';
import { fetchAdminDashboardMetrics } from './adminService';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return 'Brak danych';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getChallengeWindow(challenge) {
  const startAt = challenge.startAt || (challenge.date ? `${challenge.date}T00:00` : '');
  const endAt = challenge.endAt || (challenge.date ? `${challenge.date}T23:59` : '');
  return { startAt, endAt };
}

function AdminDashboardPanel({ adminUsers, adminChallenges, appSettings, onAdminTabChange }) {
  const [metrics, setMetrics] = useState({ completedMatches: 0 });
  const users = adminUsers.allUsers || [];
  const challenges = adminChallenges.challenges || [];

  useEffect(() => {
    fetchAdminDashboardMetrics().then(setMetrics).catch(() => setMetrics({ completedMatches: 0 }));
  }, []);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const newAccountsThisMonth = users.filter(profile => {
      const createdAt = parseDate(profile.createdAt);
      return createdAt && createdAt.getMonth() === month && createdAt.getFullYear() === year;
    }).length;

    const finishedChallenges = challenges.filter(challenge => {
      if (challenge.disabled) return false;
      const { endAt } = getChallengeWindow(challenge);
      const endDate = parseDate(endAt);
      return endDate && endDate.getTime() < now.getTime();
    }).length;

    const activeChallenges = challenges
      .filter(challenge => {
        if (challenge.disabled) return false;
        const { startAt, endAt } = getChallengeWindow(challenge);
        const startDate = parseDate(startAt);
        const endDate = parseDate(endAt);
        return startDate && endDate && startDate.getTime() <= now.getTime() && endDate.getTime() >= now.getTime();
      })
      .slice(0, 4);

    return {
      newAccountsThisMonth,
      finishedChallenges,
      activeChallenges,
      recentUsers: users.slice(0, 8),
    };
  }, [users, challenges]);

  const activeModesCount = Object.values(appSettings.activeGameModes || {}).filter(Boolean).length;
  const statCards = [
    {
      label: `${dashboardData.newAccountsThisMonth} nowych kont w tym miesiącu`,
      icon: '/icons/user.svg',
    },
    {
      label: `${dashboardData.finishedChallenges} zakończonych wyzwań`,
      icon: '/icons/ribbon.svg',
    },
    {
      label: `${metrics.completedMatches || 0} rozegranych pojedynków`,
      icon: '/icons/pojedynek.svg',
    },
    {
      label: '0 opublikowanych aktualizacji',
      icon: '/icons/flag.svg',
    },
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard-stats">
        {statCards.map(card => (
          <article className="admin-dashboard-stat glass-card" key={card.label}>
            <span className="admin-dashboard-stat__icon svg-icon" style={{ '--icon': `url(${card.icon})` }} aria-hidden="true" />
            <strong>{card.label}</strong>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-section glass-card admin-dashboard-users">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Użytkownicy</h2>
              <p className="admin-section__desc">Najnowszy podgląd kont w bazie.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => onAdminTabChange('users')}>
              Wszyscy użytkownicy
            </button>
          </div>

          <div className="admin-dashboard-mini-table">
            {dashboardData.recentUsers.map(profile => (
              <div className="admin-dashboard-mini-row" key={profile.email || profile.name}>
                <strong>{profile.name || 'Bez nazwy'}</strong>
                <span>{profile.email || 'Brak e-maila'}</span>
                <time>{formatDateTime(profile.createdAt)}</time>
              </div>
            ))}
            {dashboardData.recentUsers.length === 0 && (
              <p className="admin-dashboard-empty">Brak użytkowników do wyświetlenia.</p>
            )}
          </div>
        </section>

        <aside className="admin-dashboard-side">
          <section className="admin-section glass-card admin-dashboard-card">
            <div className="admin-section__header">
              <div>
                <h2 className="admin-section__title">Aktywne wyzwania</h2>
                <p className="admin-section__desc">Wyzwania dostępne teraz dla graczy.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => onAdminTabChange('challenges')}>
                Wszystkie wyzwania
              </button>
            </div>

            <div className="admin-dashboard-list">
              {dashboardData.activeChallenges.map(challenge => {
                const { endAt } = getChallengeWindow(challenge);
                return (
                  <div className="admin-dashboard-list-item" key={challenge.id}>
                    <strong>{challenge.title || 'Bez tytułu'}</strong>
                    <span>Do {formatDateTime(endAt)}</span>
                  </div>
                );
              })}
              {dashboardData.activeChallenges.length === 0 && (
                <p className="admin-dashboard-empty">Brak aktywnych wyzwań.</p>
              )}
            </div>
          </section>

          <section className="admin-section glass-card admin-dashboard-card">
            <div className="admin-section__header">
              <div>
                <h2 className="admin-section__title">Ustawienia aplikacji</h2>
                <p className="admin-section__desc">Szybki podgląd kluczowych przełączników.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => onAdminTabChange('settings')}>
                Wszystkie ustawienia
              </button>
            </div>

            <div className="admin-dashboard-settings">
              <div>
                <span>Rejestracja</span>
                <strong>{appSettings.registrationEnabled ? 'Włączona' : 'Wyłączona'}</strong>
              </div>
              <div>
                <span>Aktywne tryby</span>
                <strong>{activeModesCount}</strong>
              </div>
              <div>
                <span>Czas rundy</span>
                <strong>{appSettings.defaultRoundTime}s</strong>
              </div>
              <div>
                <span>Komunikat globalny</span>
                <strong>{appSettings.globalMessage ? 'Ustawiony' : 'Brak'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AdminDashboardPanel;
