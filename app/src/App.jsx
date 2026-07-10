import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useUserProfile from './hooks/useUserProfile';
import { fetchUserProfile } from './config/firebase';
import useTheme from './hooks/useTheme';
import Welcome from './pages/Welcome';
import ProfileSetup from './components/Profile/ProfileSetup';
import OnboardingModal from './components/Onboarding/OnboardingModal';
import Home from './pages/Home';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import GameWhereIsStreet from './pages/GameWhereIsStreet';
import GameWhatStreet from './pages/GameWhatStreet';
import GameWhereIsPlace from './pages/GameWhereIsPlace';
import Multiplayer from './pages/Multiplayer';
import AdminPage from './pages/AdminPage';
import BackgroundLines from './components/BackgroundLines';

function App() {
  const user = useUserProfile();
  const { theme, applyStoredTheme } = useTheme();
  const location = useLocation();
  const [buildInfo, setBuildInfo] = useState(null);
  const [profileHydrated, setProfileHydrated] = useState(false);

  useEffect(() => {
    applyStoredTheme();
  }, [theme, applyStoredTheme]);

  useEffect(() => {
    const updateLayoutWidth = () => {
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
      const gutter = viewportWidth >= 960 ? 32 : viewportWidth >= 720 ? 24 : 16;
      const availableWidth = Math.max(0, viewportWidth - gutter * 2);
      const moduleWidth = 160;
      const maxWidth = 960;
      const snappedWidth = Math.max(moduleWidth, Math.min(maxWidth, Math.floor(availableWidth / moduleWidth) * moduleWidth));
      const layoutWidth = Math.min(snappedWidth, availableWidth);
      const gridOriginX = Math.max(0, (viewportWidth - layoutWidth) / 2);

      document.documentElement.style.setProperty('--layout-width-current', `${layoutWidth}px`);
      document.documentElement.style.setProperty('--grid-origin-x', `${gridOriginX}px`);
      document.documentElement.style.setProperty('--layout-quarter', `${layoutWidth / 4}px`);
      document.documentElement.style.setProperty('--layout-half', `${layoutWidth / 2}px`);
      document.documentElement.style.setProperty('--layout-three-quarter', `${(layoutWidth / 4) * 3}px`);
    };
    const updatePointer = (event) => {
      document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);
      const interactiveTarget = event.target?.closest?.('a, button, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])');
      document.documentElement.dataset.cursor = interactiveTarget ? 'interactive' : 'default';
    };
    const updateScroll = () => {
      document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}`);
    };
    const resetPointer = () => {
      document.documentElement.dataset.cursor = 'default';
    };

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerleave', resetPointer, { passive: true });
    window.addEventListener('resize', updateLayoutWidth, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateLayoutWidth();
    updateScroll();

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('resize', updateLayoutWidth);
      window.removeEventListener('scroll', updateScroll);
    };
  }, []);

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

  const AppInfoBar = () => {
    return (
      <footer className="app-info-bar">
        <div className="app-info-bar__inner">
          <span>Copyright © 2026 by Amadeusz Żurawiecki.</span>
          <span>{buildInfo?.version ? `wersja ${buildInfo.version}` : 'wersja lokalna'}</span>
        </div>
      </footer>
    );
  };

  const AppChrome = ({ children }) => (
    <>
      <BackgroundLines />
      {children}
      <AppInfoBar />
    </>
  );

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
      <AppChrome>
        <AdminPage />
      </AppChrome>
    );
  }

  if (!user.authReady || !profileHydrated) {
    return (
      <AppChrome>
        <div className="game-loading">
          <div className="game-loading__spinner" />
          <p>Sprawdzanie sesji...</p>
        </div>
      </AppChrome>
    );
  }

  // 1. Mandatory Auth Gatekeeper: must be logged in via Google
  if (!user.isLoggedIn) {
    return (
      <AppChrome>
        <Welcome />
      </AppChrome>
    );
  }

  // 2. Mandatory Onboarding Slides Gatekeeper: must read introductory slides
  if (!user.hasCompletedOnboarding) {
    return (
      <AppChrome>
        <OnboardingModal />
      </AppChrome>
    );
  }

  // 3. Mandatory Profile Gatekeeper: must complete driver profile setup
  if (!user.hasCompletedProfile) {
    return (
      <AppChrome>
        <ProfileSetup />
      </AppChrome>
    );
  }

  // 3. Main App Routes
  return (
    <AppChrome>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/game/where-is-street" element={<GameWhereIsStreet />} />
        <Route path="/game/what-street" element={<GameWhatStreet />} />
        <Route path="/game/where-is-place" element={<GameWhereIsPlace />} />
        <Route path="/game/multiplayer" element={<Multiplayer />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppChrome>
  );
}

export default App;
