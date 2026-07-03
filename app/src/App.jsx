import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useUserProfile from './hooks/useUserProfile';
import { fetchUserProfile } from './config/firebase';
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
  const location = useLocation();
  const isLocalTestMode = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const TestLoginBar = () => {
    if (!isLocalTestMode) return null;
    return (
      <div style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 5000,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => user.loginAsTestUser(false)}
          style={{
            padding: '10px 12px',
            background: 'var(--green-primary)',
            color: '#0a0a0f',
            fontWeight: 800,
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
          }}
        >
          Test user
        </button>
        <button
          onClick={() => user.loginAsTestUser(true)}
          style={{
            padding: '10px 12px',
            background: '#fff',
            color: '#0a0a0f',
            fontWeight: 800,
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
          }}
        >
          Test admin
        </button>
      </div>
    );
  };

  useEffect(() => {
    if (!isLocalTestMode) return;

    const wantsAdmin = location.pathname === '/admin' || new URLSearchParams(location.search).get('testLogin') === 'admin';
    const isTestUser = user.googleUser?.isTestUser;
    const shouldAutoLogin = !user.isLoggedIn || (wantsAdmin && user.email !== 'amadeuszzurawiecki@gmail.com');

    if (shouldAutoLogin || !isTestUser) {
      user.loginAsTestUser(wantsAdmin);
    }
  }, [isLocalTestMode, location.pathname, location.search, user.isLoggedIn, user.email, user.googleUser?.isTestUser]);

  // Sync user profile from Firestore when logged in
  useEffect(() => {
    if (user.isLoggedIn && user.email && !user.googleUser?.isTestUser) {
      async function syncFromCloud() {
        try {
          const cloudProfile = await fetchUserProfile(user.email);
          if (cloudProfile) {
            user.updateProfile({
              name: cloudProfile.name || user.name,
              town: cloudProfile.town || user.town,
              avatarId: cloudProfile.avatarId || user.avatarId,
              car: cloudProfile.car || user.car,
              stats: cloudProfile.stats || user.stats,
              challengeAttempts: cloudProfile.challengeAttempts || user.challengeAttempts,
              hasCompletedProfile: cloudProfile.hasCompletedProfile || false,
              hasCompletedOnboarding: cloudProfile.hasCompletedOnboarding || user.hasCompletedOnboarding,
              hideEmail: cloudProfile.hideEmail || false,
              isPremium: cloudProfile.isPremium || false,
              customAvatar: cloudProfile.customAvatar || null,
              dailyGamesPlayed: cloudProfile.dailyGamesPlayed || { date: '', count: 0 },
              onlineWins: cloudProfile.onlineWins || 0,
              onlineLosses: cloudProfile.onlineLosses || 0,
              onlineDraws: cloudProfile.onlineDraws || 0
            });
          }
        } catch (e) {
          console.warn('Error fetching cloud profile on startup:', e);
        }
      }
      syncFromCloud();
    }
  }, [user.isLoggedIn, user.email]);

  // Special route: Admin panel handles its own login and authorization
  if (location.pathname === '/admin') {
    return (
      <>
        <AdminPage />
        <TestLoginBar />
      </>
    );
  }

  // 1. Mandatory Auth Gatekeeper: must be logged in via Google
  if (!user.isLoggedIn) {
    return (
      <>
        <Welcome />
        <TestLoginBar />
      </>
    );
  }

  // 2. Mandatory Onboarding Slides Gatekeeper: must read introductory slides
  if (!user.hasCompletedOnboarding) {
    return (
      <>
        <OnboardingModal />
        <TestLoginBar />
      </>
    );
  }

  // 3. Mandatory Profile Gatekeeper: must complete driver profile setup
  if (!user.hasCompletedProfile) {
    return (
      <>
        <ProfileSetup />
        <TestLoginBar />
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
      <TestLoginBar />
    </>
  );
}

export default App;
