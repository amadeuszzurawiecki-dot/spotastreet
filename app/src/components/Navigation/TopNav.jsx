import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useUserProfile from '../../hooks/useUserProfile';
import useTheme from '../../hooks/useTheme';
import { logoutUser } from '../../config/firebase';
import { AVATARS } from '../../data/avatars';
import './TopNav.css';

const ADMIN_EMAIL = 'amadeuszzurawiecki@gmail.com';

function getStoredTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem('spotastreet-theme') || '{}');
    return stored?.state?.theme === 'dark' ? 'dark' : 'light';
  } catch {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
}

function applyIsolatedTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  localStorage.setItem('spotastreet-theme', JSON.stringify({ state: { theme: nextTheme }, version: 0 }));
}

export function TopNav({ variant = 'front', adminTab = 'users', onAdminTabChange, isolatedThemeToggle = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isolatedTheme, setIsolatedTheme] = useState(getStoredTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserProfile();
  const { theme, toggleTheme } = useTheme();
  const isAdminVariant = variant === 'admin';
  const userEmail = user.email || '';
  const normalizedEmail = userEmail.toLowerCase().trim();
  const canSeeAdmin = !!user.isPremium || normalizedEmail === ADMIN_EMAIL;

  const avatarSrc = user.customAvatar
    || AVATARS.find(avatar => avatar.id === user.avatarId)?.image
    || AVATARS[0]?.image
    || '';

  const userDisplayName = normalizedEmail === ADMIN_EMAIL
    ? 'Amadeusz'
    : (user.name || userEmail.split('@')[0] || 'Użytkownik');

  const handleLogout = async () => {
    setIsOpen(false);
    await logoutUser();
    user.logout();
    navigate('/');
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleAdminTab = (tab) => {
    setIsOpen(false);
    onAdminTabChange?.(tab);
    if (location.pathname !== '/admin') {
      navigate('/admin');
    }
  };

  const handleLogoClick = () => {
    if (isAdminVariant) {
      handleAdminTab('users');
      return;
    }
    handleNavigate('/');
  };

  const frontNavItems = [
    { label: 'Profil', path: '/profile', icon: '/icons/user.svg', railIcon: 'user', desc: 'Konto i mapa' },
    { label: 'Ranking', path: '/leaderboard', icon: '/icons/ribbon.svg', railIcon: 'ranking', desc: 'Wyniki graczy' },
    { label: 'Admin', path: '/admin', icon: '/icons/admin.svg', railIcon: 'settings', desc: 'Panel' },
  ].filter(item => item.path !== '/admin' || canSeeAdmin);

  const adminNavItems = [
    { label: 'Użytkownicy', id: 'users', icon: '/icons/user.svg', railIcon: 'user', desc: 'Konta' },
    { label: 'Wyzwania', id: 'challenges', icon: '/icons/star.svg', railIcon: 'target', desc: 'Codzienne' },
    { label: 'Ustawienia aplikacji', id: 'settings', icon: '/icons/admin.svg', railIcon: 'settings', desc: 'Globalne' },
    { label: 'Powrót na front', path: '/', icon: '/icons/play.svg', railIcon: 'arrow-left', desc: 'Aplikacja' },
  ];

  const navItems = isAdminVariant ? adminNavItems : frontNavItems;
  const gameDrawerItems = isAdminVariant ? [] : [
    { label: 'Wyzwania', path: '/challenges', icon: '/icons/ribbon.svg' },
    { label: 'Wskaż ulicę', path: '/game/where-is-street', icon: '/icons/umiesc.svg' },
    { label: 'Nazwij ulicę', path: '/game/what-street', icon: '/icons/nazwij.svg' },
  ];
  const activeTheme = isolatedThemeToggle ? isolatedTheme : theme;

  const handleThemeToggle = () => {
    if (!isolatedThemeToggle) {
      toggleTheme();
      return;
    }

    const nextTheme = isolatedTheme === 'dark' ? 'light' : 'dark';
    applyIsolatedTheme(nextTheme);
    setIsolatedTheme(nextTheme);
  };

  const LogoSygnet = () => (
    <svg className="topnav-logo__sygnet" viewBox="0 0 596.3 535.4" width="22" height="20">
      <path 
        d="M520.4 66.1c-10.1-9.1-21.2-16.9-33.3-23.5-48.3-26.5-112.5-35-189-35C119.6 7.6 8.4 53.7 8.4 267.7c0 99.3 23.9 162.5 67.4 201.7 10.1 9.1 21.2 16.9 33.3 23.5 48.3 26.5 112.5 35 189 35 178.6 0 289.7-46.1 289.7-260.2.1-99.3-23.9-162.5-67.4-201.6m-392 340.7-30.1 35.9c-.9 1-2.5 0-2-1.2l20.8-48c-4.7-6.9-8.8-14.8-12.3-24C95 344 90 309.7 90 267.7s5-76.2 14.7-101.7c7.4-19.3 17.3-33.3 31.1-43.8 29.5-22.6 81.1-33.1 162.3-33.1 65 0 88.7 8.3 8.3 106.4zm363.1-37.4c-7.4 19.3-17.3 33.3-31.1 43.8-29.5 22.6-81.1 33.1-162.3 33.1-65 0-88.7-8.3-8.3-106.4l178.1-211.2L498 92.8c.9-1 2.5 0 2 1.2l-20.8 48c4.7 6.9 8.8 14.8 12.3 24 9.8 25.5 14.7 59.7 14.7 101.7.1 42-4.9 76.3-14.7 101.7" 
        fill="currentColor"
      />
    </svg>
  );

  const LogoText = () => (
    <span className="topnav-logo__text">
      SPOTASTREET
      {isAdminVariant && <span className="topnav-logo__admin"> ADMIN</span>}
    </span>
  );

  const UserPill = () => user.isLoggedIn ? (
    <div className={`topnav-user-pill ${user.isPremium ? 'topnav-user-pill--premium' : ''}`}>
      <span className="topnav-user-pill__avatar" aria-hidden="true">
        {avatarSrc ? <img src={avatarSrc} alt="" /> : <span className="line-icon line-icon--user" aria-hidden="true" />}
      </span>
      <span className="topnav-user-pill__copy">
        <strong>{userDisplayName}</strong>
        <span>{userEmail}</span>
      </span>
    </div>
  ) : null;

  const itemIsActive = (item) => {
    if (item.id) return adminTab === item.id;
    return location.pathname === item.path;
  };

  const handleItemClick = (item) => {
    if (item.id) {
      handleAdminTab(item.id);
      return;
    }
    handleNavigate(item.path);
  };

  return (
    <>
      <header className={`topnav ${isAdminVariant ? 'topnav--admin' : ''}`}>
        <div className="topnav__inner">
          {/* Left Side: Logo (Sygnet + Text) */}
          <div className="topnav-logo" onClick={handleLogoClick}>
            <LogoSygnet />
            <LogoText />
          </div>

          <nav className="topnav-links" aria-label="Nawigacja">
            {navItems.map(item => (
              <button
                key={item.path || item.id}
                className={`topnav-link ${itemIsActive(item) ? 'topnav-link--active' : ''}`}
                onClick={() => handleItemClick(item)}
                data-label={item.label}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <UserPill />

          {/* Right Side: Hamburger Button */}
          <button
            className={`topnav-hamburger ${isOpen ? 'topnav-hamburger--open' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            <span className="svg-icon topnav-hamburger__icon" style={{ '--icon': 'url(/icons/menu.svg)' }} aria-hidden="true" />
          </button>
        </div>
      </header>

      <aside className="desktop-rail" aria-label="Nawigacja aplikacji">
        <div className="topnav-logo desktop-rail__logo" onClick={handleLogoClick}>
          <LogoSygnet />
          <LogoText />
        </div>

        <nav className="desktop-rail__nav">
          {navItems.map(item => (
            <button
              key={item.path || item.id}
              className={`desktop-rail__card ${itemIsActive(item) ? 'desktop-rail__card--active' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className={`desktop-rail__icon line-icon line-icon--${item.railIcon}`} aria-hidden="true" />
              <span>
                <span className="desktop-rail__label">{item.label}</span>
                <span className="desktop-rail__desc">{item.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        <button className="desktop-rail__logout" onClick={handleLogout}>
          Wyloguj
        </button>
      </aside>

      <button
        className={`menu-drawer__backdrop ${isOpen ? 'menu-drawer__backdrop--open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-label="Zamknij menu"
        tabIndex={isOpen ? 0 : -1}
      />

      {/* Full-Screen Drawer Menu */}
      <div className={`menu-drawer ${isOpen ? 'menu-drawer--open' : ''}`}>
        <div className="menu-drawer__header">
          <div className="topnav-logo" onClick={handleLogoClick}>
            <LogoSygnet />
            <LogoText />
          </div>
          <button className="menu-drawer__close" onClick={() => setIsOpen(false)} aria-label="Zamknij menu">
            <span className="svg-icon" style={{ '--icon': 'url(/icons/x.svg)' }} aria-hidden="true" />
          </button>
        </div>

        <nav className="menu-drawer__nav">
          <div className="menu-drawer__nav-links">
            {gameDrawerItems.length > 0 && (
              <div className="menu-drawer__group">
                {gameDrawerItems.map(item => (
                  <button
                    key={item.path}
                    className={`menu-drawer__link ${location.pathname === item.path ? 'menu-drawer__link--active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="svg-icon menu-drawer__icon" style={{ '--icon': `url(${item.icon})` }} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {navItems.map(item => (
              <button
                key={item.path || item.id}
                className={`menu-drawer__link ${itemIsActive(item) ? 'menu-drawer__link--active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <span className="svg-icon menu-drawer__icon" style={{ '--icon': `url(${item.icon})` }} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="menu-drawer__account-actions">
            <button type="button" className="menu-drawer__theme" onClick={(event) => {
              event.stopPropagation();
              handleThemeToggle();
            }}>
              <span
                className="svg-icon menu-drawer__icon"
                style={{ '--icon': `url(/icons/${activeTheme === 'dark' ? 'light' : 'dark'}.svg)` }}
                aria-hidden="true"
              />
              <span>{activeTheme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}</span>
            </button>

            <button
              className="menu-drawer__link menu-drawer__link--logout"
              onClick={handleLogout}
            >
              <span className="svg-icon menu-drawer__icon" style={{ '--icon': 'url(/icons/logout.svg)' }} aria-hidden="true" />
              <span>Wyloguj się</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

export default TopNav;
