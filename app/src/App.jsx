import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useUserProfile from './hooks/useUserProfile';
import { fetchUserProfile } from './config/firebase';
import useTheme from './hooks/useTheme';
import Welcome from './pages/Welcome';
import ProfileSetup from './components/Profile/ProfileSetup';
import OnboardingModal from './components/Onboarding/OnboardingModal';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import GameWhereIsStreet from './pages/GameWhereIsStreet';
import GameWhatStreet from './pages/GameWhatStreet';
import GameWhereIsPlace from './pages/GameWhereIsPlace';
import Multiplayer from './pages/Multiplayer';
import AdminPage from './pages/AdminPage';

function App() {
  const user = useUserProfile();
  const { theme, applyStoredTheme } = useTheme();
  const location = useLocation();
  const [buildInfo, setBuildInfo] = useState(null);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const isLocalTestMode = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    applyStoredTheme();
  }, [theme, applyStoredTheme]);

  useEffect(() => {
    localStorage.removeItem('bolters-persistent-user-database');
    localStorage.removeItem('bolters_google_client_id');
    const unsubscribe = user.initializeAuthListener();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetch('/build-info.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => setBuildInfo(info))
      .catch(() => setBuildInfo(null));
  }, []);

  const BuildVersionBadge = () => {
    if (!buildInfo?.version) return null;
    return (
      <div
        title={`${buildInfo.commitMessage || buildInfo.version}${buildInfo.shortSha ? ` (${buildInfo.shortSha})` : ''}`}
        style={{
          position: 'fixed',
          right: 12,
          bottom: isLocalTestMode ? 60 : 12,
          zIndex: 4999,
          maxWidth: 'min(320px, calc(100vw - 24px))',
          padding: '7px 10px',
          background: 'rgba(10, 10, 15, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: 'rgba(255, 255, 255, 0.72)',
          fontSize: '0.72rem',
          fontWeight: 700,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        wersja: <span style={{ color: 'var(--green-primary)' }}>{buildInfo.version}</span>
        {buildInfo.shortSha && <span style={{ color: 'rgba(255,255,255,0.42)' }}> · {buildInfo.shortSha}</span>}
      </div>
    );
  };

  // Sync user profile from Firestore when logged in with Firebase Auth
  useEffect(() => {
    if (!user.authReady) {
      setProfileHydrated(false);
      return;
    }

    if (!user.isLoggedIn || !user.email) {
      setProfileHydrated(true);
      return;
    }

    let cancelled = false;

    async function syncFromCloud() {
      try {
        const cloudProfile = await fetchUserProfile(user.email);
        if (!cancelled && cloudProfile) {
          user.updateProfile({
            name: cloudProfile.name || user.name,
            town: cloudProfile.town || user.town,
            avatarId: cloudProfile.avatarId || user.avatarId,
            car: cloudProfile.car || user.car,
            stats: cloudProfile.stats || user.stats,
            challengeAttempts: cloudProfile.challengeAttempts || user.challengeAttempts,
            hasCompletedProfile: cloudProfile.hasCompletedProfile || false,
            hasCompletedOnboarding: cloudProfile.hasCompletedOnboarding || false,
            hideEmail: cloudProfile.hideEmail || false,
            isPremium: cloudProfile.isPremium || false,
            customAvatar: cloudProfile.customAvatar || null,
            dailyGamesPlayed: cloudProfile.dailyGamesPlayed || { date: '', count: 0 },
            onlineWins: cloudProfile.onlineWins || 0,
            onlineLosses: cloudProfile.onlineLosses || 0,
            onlineDraws: cloudProfile.onlineDraws || 0,
            mapStyle: cloudProfile.mapStyle || user.mapStyle || 'dark'
          });
        }
      } catch (e) {
        console.warn('Error fetching cloud profile on startup:', e);
      } finally {
        if (!cancelled) setProfileHydrated(true);
      }
    }
    syncFromCloud();

    return () => {
      cancelled = true;
    };
  }, [user.authReady, user.isLoggedIn, user.email]);

  // Special route: Admin panel handles its own login and authorization
  if (location.pathname === '/admin') {
    return (
      <>
        <AdminPage />
        <BuildVersionBadge />
      </>
    );
  }

  if (!user.authReady || !profileHydrated) {
    return (
      <>
        <div className="game-loading">
          <div className="game-loading__spinner" />
          <p>Sprawdzanie sesji...</p>
        </div>
        <BuildVersionBadge />
      </>
    );
  }

  // 1. Mandatory Auth Gatekeeper: must be logged in via Google
  if (!user.isLoggedIn) {
    return (
      <>
        <Welcome />
        <BuildVersionBadge />
      </>
    );
  }

  // 2. Mandatory Onboarding Slides Gatekeeper: must read introductory slides
  if (!user.hasCompletedOnboarding) {
    return (
      <>
        <OnboardingModal />
        <BuildVersionBadge />
      </>
    );
  }

  // 3. Mandatory Profile Gatekeeper: must complete driver profile setup
  if (!user.hasCompletedProfile) {
    return (
      <>
        <ProfileSetup />
        <BuildVersionBadge />
      </>
    );
  }

  // 3. Main App Routes
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/game/where-is-street" element={<GameWhereIsStreet />} />
        <Route path="/game/what-street" element={<GameWhatStreet />} />
        <Route path="/game/where-is-place" element={<GameWhereIsPlace />} />
        <Route path="/game/multiplayer" element={<Multiplayer />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BuildVersionBadge />
    </>
  );
}

export default App;
