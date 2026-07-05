import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import useAppSettings from '../hooks/useAppSettings';
import {
  fetchAllCloudProfiles,
  saveDailyChallenge,
  fetchDailyChallenges,
  deleteDailyChallenge,
  updateUserPremiumStatus,
  updateUserProfileByEmail,
  resetUserChallengeAttempt,
} from '../config/firebase';
import { GOOGLE_CLIENT_ID } from '../utils/googleAuth';
import { maskEmail } from '../utils/privacy';
import { AVATARS } from '../data/avatars';
import './AdminPage.css';

export function AdminPage() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const appSettings = useAppSettings();
  const [cloudProfiles, setCloudProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingEmail, setDeletingEmail] = useState(null); // email being deleted or confirming deletion
  const [actionStatus, setActionStatus] = useState(null);

  const googleBtnRef = useRef(null);
  const isRenderedRef = useRef(false);

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'challenges' | 'settings'
  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Challenge Form State
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeIcon, setChallengeIcon] = useState('target');
  const [challengeGameMode, setChallengeGameMode] = useState('where-is-street');
  const [challengeRounds, setChallengeRounds] = useState(15);
  const [challengeTimeLimit, setChallengeTimeLimit] = useState(15);
  const [challengeStreets, setChallengeStreets] = useState('');
  const [challengeDate, setChallengeDate] = useState('');
  const [challengeImageUrl, setChallengeImageUrl] = useState('');
  const [challengeDisabled, setChallengeDisabled] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState(null);
  const [challengeEditorOpen, setChallengeEditorOpen] = useState(false);

  // User editor state
  const [editingUser, setEditingUser] = useState(null);
  const [userDraft, setUserDraft] = useState(null);
  const [resetChallengeId, setResetChallengeId] = useState('');

  // Load cloud profiles from Firestore
  const loadProfiles = async () => {
    setLoading(true);
    const profiles = await fetchAllCloudProfiles();
    setCloudProfiles(profiles || []);
    setLoading(false);
  };

  // Load Challenges
  const loadChallengesList = async () => {
    setLoadingChallenges(true);
    const list = await fetchDailyChallenges();
    setChallenges((list || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setLoadingChallenges(false);
  };

  useEffect(() => {
    if (!user.authReady || !user.isLoggedIn || !user.isAdmin) return;
    if (activeTab === 'challenges') {
      loadChallengesList();
    }
  }, [activeTab, user.authReady, user.isLoggedIn, user.isAdmin]);

  useEffect(() => {
    appSettings.loadSettings();
  }, []);

  const handleToggleSummaryMap = async () => {
    const nextValue = !appSettings.summaryMapEnabled;
    setActionStatus({
      type: 'info',
      message: nextValue ? 'Włączanie mapy podsumowania pojedynku...' : 'Wyłączanie mapy podsumowania pojedynku...'
    });

    const ok = await appSettings.updateSettings({ summaryMapEnabled: nextValue });
    setActionStatus({
      type: ok ? 'success' : 'error',
      message: ok
        ? (nextValue ? 'Mapa podsumowania pojedynku została włączona.' : 'Mapa podsumowania pojedynku została wyłączona.')
        : 'Nie udało się zapisać ustawienia mapy podsumowania.'
    });
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setChallengeImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUserPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file || !userDraft) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserDraft(prev => ({
        ...prev,
        customAvatar: reader.result,
        avatarId: 'custom',
      }));
    };
    reader.readAsDataURL(file);
  };

  const getAvatarImage = (profile) => {
    if (profile?.customAvatar) return profile.customAvatar;
    const avatar = AVATARS.find(a => a.id === profile?.avatarId) || AVATARS[0];
    return avatar?.image || '';
  };

  const openUserEditor = (profile) => {
    const draft = {
      email: profile.email || '',
      name: profile.name || '',
      town: profile.town || 'Legnica',
      avatarId: profile.avatarId || AVATARS[0]?.id,
      customAvatar: profile.customAvatar || null,
      hideEmail: !!profile.hideEmail,
      isPremium: !!profile.isPremium,
      stats: profile.stats || {},
      challengeAttempts: profile.challengeAttempts || {},
      onlineWins: profile.onlineWins || 0,
      onlineLosses: profile.onlineLosses || 0,
      onlineDraws: profile.onlineDraws || 0,
    };
    setEditingUser(profile);
    setUserDraft(draft);
    setResetChallengeId('');
  };

  const closeUserEditor = () => {
    setEditingUser(null);
    setUserDraft(null);
    setResetChallengeId('');
  };

  const patchActiveLocalUser = (email, fields) => {
    if (email.toLowerCase().trim() === user.email?.toLowerCase()?.trim()) {
      user.updateProfile(fields);
    }
  };

  const handleSaveUserProfile = async () => {
    if (!userDraft?.email) return;
    const fields = {
      name: userDraft.name.trim() || 'Użytkownik Bolters',
      town: userDraft.town.trim() || 'Legnica',
      avatarId: userDraft.avatarId,
      customAvatar: userDraft.customAvatar || null,
      hideEmail: !!userDraft.hideEmail,
      isPremium: !!userDraft.isPremium,
    };

    setActionStatus({ type: 'info', message: `Zapisywanie profilu ${maskEmail(userDraft.email)}...` });
    const ok = await updateUserProfileByEmail(userDraft.email, fields);
    if (ok) {
      patchActiveLocalUser(userDraft.email, fields);
      await loadProfiles();
      closeUserEditor();
      setActionStatus({ type: 'success', message: 'Profil użytkownika został zaktualizowany.' });
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się zapisać zmian profilu.' });
    }
  };

  const handleResetUserChallenge = async () => {
    if (!userDraft?.email) return;
    const challengeId = resetChallengeId.trim();
    const ok = await resetUserChallengeAttempt(userDraft.email, challengeId || null);
    if (ok) {
      const nextAttempts = challengeId
        ? Object.fromEntries(Object.entries(userDraft.challengeAttempts || {}).filter(([id]) => id !== challengeId))
        : {};
      setUserDraft(prev => ({ ...prev, challengeAttempts: nextAttempts }));
      patchActiveLocalUser(userDraft.email, { challengeAttempts: nextAttempts });
      await loadProfiles();
      setActionStatus({
        type: 'success',
        message: challengeId ? `Zresetowano wyzwanie ${challengeId}.` : 'Zresetowano wszystkie wyzwania użytkownika.',
      });
      setResetChallengeId('');
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się zresetować wyzwania.' });
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!challengeTitle || !challengeDate) {
      setActionStatus({ type: 'error', message: 'Tytuł wyzwania oraz Data zaplanowania są wymagane!' });
      return;
    }

    const streetList = challengeStreets
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const challengeData = {
      id: editingChallengeId || `challenge_${Date.now()}`,
      title: challengeTitle,
      description: challengeDesc,
      icon: challengeIcon,
      gameMode: challengeGameMode,
      rounds: Number(challengeRounds),
      timeLimit: Number(challengeTimeLimit),
      streets: streetList,
      date: challengeDate, // YYYY-MM-DD
      imageUrl: challengeImageUrl || '',
      disabled: challengeDisabled,
      createdAt: new Date().toISOString()
    };

    setActionStatus({ type: 'info', message: 'Zapisywanie wyzwania w bazie Firestore...' });
    const success = await saveDailyChallenge(challengeData);
    if (success) {
      setActionStatus({ 
        type: 'success', 
        message: editingChallengeId 
          ? `Zaktualizowano wyzwanie "${challengeTitle}".` 
          : `Wyzwanie "${challengeTitle}" zostało utworzone.` 
      });
      closeChallengeEditor();
      loadChallengesList();
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się zapisać wyzwania w chmurze.' });
    }
  };

  const resetChallengeForm = () => {
    setEditingChallengeId(null);
    setChallengeTitle('');
    setChallengeDesc('');
    setChallengeIcon('target');
    setChallengeGameMode('where-is-street');
    setChallengeRounds(15);
    setChallengeTimeLimit(15);
    setChallengeStreets('');
    setChallengeDate('');
    setChallengeImageUrl('');
    setChallengeDisabled(false);
  };

  const openChallengeCreator = () => {
    resetChallengeForm();
    setChallengeDate(new Date().toLocaleDateString('sv-SE'));
    setChallengeEditorOpen(true);
  };

  const handleStartEdit = (ch) => {
    setEditingChallengeId(ch.id);
    setChallengeTitle(ch.title);
    setChallengeDesc(ch.description || '');
    setChallengeIcon(ch.icon || 'target');
    setChallengeGameMode(ch.gameMode || 'where-is-street');
    setChallengeRounds(ch.rounds || 15);
    setChallengeTimeLimit(ch.timeLimit || 15);
    setChallengeStreets((ch.streets || []).join('\n'));
    setChallengeDate(ch.date);
    setChallengeImageUrl(ch.imageUrl || '');
    setChallengeDisabled(!!ch.disabled);
    setChallengeEditorOpen(true);
  };

  const handleToggleDisable = async (ch) => {
    const updated = {
      ...ch,
      disabled: !ch.disabled
    };
    setActionStatus({ type: 'info', message: 'Aktualizowanie statusu wyzwania...' });
    const success = await saveDailyChallenge(updated);
    if (success) {
      setActionStatus({ 
        type: 'success', 
        message: `Status wyzwania został zaktualizowany.` 
      });
      loadChallengesList();
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się zmienić statusu wyzwania.' });
    }
  };

  const handleCancelEdit = () => {
    resetChallengeForm();
    setChallengeEditorOpen(false);
  };

  const closeChallengeEditor = () => {
    resetChallengeForm();
    setChallengeEditorOpen(false);
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to wyzwanie codzienne?')) return;
    setActionStatus({ type: 'info', message: 'Usuwanie wyzwania...' });
    const success = await deleteDailyChallenge(id);
    if (success) {
      setActionStatus({ type: 'success', message: 'Wyzwanie zostało usunięte z bazy danych.' });
      if (editingChallengeId === id) {
        closeChallengeEditor();
      }
      loadChallengesList();
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się usunąć wyzwania.' });
    }
  };


  useEffect(() => {
    if (!user.authReady || !user.isLoggedIn || !user.isAdmin) return;
    loadProfiles();
  }, [user.authReady, user.isLoggedIn, user.isAdmin]);

  // Handle Google Sign In if user is not logged in
  const handleCredentialResponse = async (response) => {
    setIsSigningIn(true);
    try {
      await user.loginWithGoogleCredential(response.credential);
    } catch (e) {
      console.error('GIS Error:', e);
      setActionStatus({ type: 'error', message: 'Nie udało się dokończyć logowania przyciskiem Google. Spróbuj alternatywnego logowania poniżej.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePopupLogin = async () => {
    setIsSigningIn(true);
    setActionStatus(null);
    try {
      await user.loginWithGooglePopup();
    } catch (e) {
      console.error('Firebase popup login error:', e);
      setActionStatus({ type: 'error', message: `Błąd logowania kontem Google${e?.code ? `: ${e.code}` : ''}.` });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRefreshAdminClaim = async () => {
    setActionStatus({ type: 'info', message: 'Odświeżanie uprawnień administratora...' });
    try {
      const hasAdmin = await user.refreshAdminClaim();
      setActionStatus({
        type: hasAdmin ? 'success' : 'error',
        message: hasAdmin
          ? 'Uprawnienia administratora są aktywne.'
          : 'Token odświeżony, ale konto nadal nie ma claim admin=true.',
      });
    } catch (e) {
      console.error('Admin claim refresh error:', e);
      setActionStatus({ type: 'error', message: 'Nie udało się odświeżyć tokena uprawnień.' });
    }
  };

  useEffect(() => {
    if (user.isLoggedIn) return;

    let intervalId = null;
    const initGoogleGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && !isRenderedRef.current) {
        try {
          isRenderedRef.current = true;
          if (intervalId) clearInterval(intervalId);

          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 300,
          });
        } catch (err) {
          console.warn('Google GSI Admin init warning:', err);
          isRenderedRef.current = false;
        }
      }
    };

    initGoogleGsi();
    intervalId = setInterval(initGoogleGsi, 300);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user.isLoggedIn]);

  // Combine local and cloud profiles into unique user dictionary
  const profileMap = {};
  
  // 1. Add Cloud profiles
  cloudProfiles.forEach(p => {
    if (p.email || p.name) {
      const key = (p.email || p.name).toLowerCase().trim();
      profileMap[key] = {
        email: p.email || 'Brak emaila',
        name: p.name || 'Użytkownik Bolters',
        town: p.town || 'Legnica',
        avatarId: p.avatarId || 'bolciarz-1',
        customAvatar: p.customAvatar || null,
        car: p.car,
        stats: p.stats || {},
        challengeAttempts: p.challengeAttempts || {},
        hideEmail: !!p.hideEmail,
        onlineWins: p.onlineWins || 0,
        onlineLosses: p.onlineLosses || 0,
        onlineDraws: p.onlineDraws || 0,
        updatedAt: p.updatedAt,
        source: 'Chmura',
        isPremium: !!p.isPremium
      };
    }
  });

  // 2. Merge Local saved profiles
  Object.values(user.savedProfiles || {}).forEach(p => {
    if (p.email || p.name) {
      const key = (p.email || p.name).toLowerCase().trim();
      profileMap[key] = {
        ...(profileMap[key] || {}),
        email: p.email || profileMap[key]?.email || 'Brak emaila',
        name: p.name || profileMap[key]?.name || 'Użytkownik Bolters',
        town: p.town || profileMap[key]?.town || 'Legnica',
        avatarId: p.avatarId || profileMap[key]?.avatarId || 'bolciarz-1',
        customAvatar: p.customAvatar || profileMap[key]?.customAvatar || null,
        car: p.car || profileMap[key]?.car,
        stats: p.stats || profileMap[key]?.stats || {},
        challengeAttempts: p.challengeAttempts || profileMap[key]?.challengeAttempts || {},
        hideEmail: !!p.hideEmail || !!profileMap[key]?.hideEmail,
        onlineWins: p.onlineWins || profileMap[key]?.onlineWins || 0,
        onlineLosses: p.onlineLosses || profileMap[key]?.onlineLosses || 0,
        onlineDraws: p.onlineDraws || profileMap[key]?.onlineDraws || 0,
        source: profileMap[key] ? 'Chmura + Lokalnie' : 'Lokalnie',
        isPremium: !!p.isPremium || !!profileMap[key]?.isPremium
      };
    }
  });

  // 3. Ensure currently logged in active user is visible
  if (user.isLoggedIn && user.email) {
    const key = user.email.toLowerCase().trim();
    if (!profileMap[key]) {
      profileMap[key] = {
        email: user.email,
        name: user.name || 'Aktywny Użytkownik',
        town: user.town || 'Legnica',
        avatarId: user.avatarId || 'bolciarz-1',
        customAvatar: user.customAvatar || null,
        car: user.car,
        stats: user.stats || {},
        challengeAttempts: user.challengeAttempts || {},
        hideEmail: !!user.hideEmail,
        onlineWins: user.onlineWins || 0,
        onlineLosses: user.onlineLosses || 0,
        onlineDraws: user.onlineDraws || 0,
        source: 'Sesja Aktywna',
        isPremium: !!user.isPremium
      };
    }
  }

  const allUsers = Object.values(profileMap);

  // Filter users by search term
  const filteredUsers = allUsers.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.town.toLowerCase().includes(term)
    );
  });

  // Action: Confirm and Delete User Account
  const handleDeleteConfirm = async () => {
    if (!deletingEmail) return;
    const target = deletingEmail;
    setDeletingEmail(null);
    setActionStatus({ type: 'info', message: `Usuwanie konta ${target}...` });

    try {
      await user.deleteUserAccount(target);
      await loadProfiles();
      closeUserEditor();
      setActionStatus({ type: 'success', message: `Konto ${target} zostało pomyślnie usunięte.` });
    } catch (e) {
      console.error('Delete error:', e);
      setActionStatus({ type: 'error', message: `Nie udało się usunąć konta ${target}.` });
    }
  };

  // Action: Toggle Premium Status of a user
  const handleTogglePremium = async (email, currentPremium) => {
    setActionStatus({ type: 'info', message: `Zapisywanie statusu Premium dla ${maskEmail(email)}...` });
    try {
      const success = await updateUserPremiumStatus(email, !currentPremium);
      if (success) {
        setActionStatus({ type: 'success', message: `Pomyślnie zmieniono status Premium dla ${maskEmail(email)}!` });
        
        // Update local active user if they changed themselves
        if (email.toLowerCase().trim() === user.email?.toLowerCase()?.trim()) {
          user.updateProfile({ isPremium: !currentPremium });
        }
        
        await loadProfiles();
      } else {
        setActionStatus({ type: 'error', message: `Błąd podczas aktualizowania statusu Premium.` });
      }
    } catch (e) {
      console.error(e);
      setActionStatus({ type: 'error', message: `Wystąpił błąd podczas zmiany statusu Premium.` });
    }
  };

  const getUserStatsTotals = (profile) => {
    const modeStats = Object.values(profile.stats || {});
    const singleWins = modeStats.reduce((sum, item) => sum + (Number(item?.wins) || 0), 0);
    const singleLosses = modeStats.reduce((sum, item) => sum + (Number(item?.losses) || 0), 0);
    const challengesCount = Object.keys(profile.challengeAttempts || {}).length;
    return {
      singleWins,
      singleLosses,
      challengesCount,
      onlineTotal: (profile.onlineWins || 0) + (profile.onlineLosses || 0) + (profile.onlineDraws || 0),
    };
  };

  const todayStr = new Date().toLocaleDateString('sv-SE');
  const gameModeLabels = {
    'where-is-street': 'Gdzie jest ta ulica?',
    'where-is-place': 'Gdzie jest to miejsce?',
    'what-street': 'Co to za ulica?',
  };

  const getChallengeStatus = (challenge) => {
    if (challenge.disabled) return { label: 'Wyłączone', type: 'disabled' };
    if ((challenge.date || '') === todayStr) return { label: 'Aktywne teraz', type: 'active' };
    if ((challenge.date || '') > todayStr) return { label: 'Zaplanowane', type: 'scheduled' };
    return { label: 'Historyczne', type: 'history' };
  };

  const sortedChallenges = [...challenges].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const challengeGroups = [
    {
      id: 'active',
      title: 'Aktywne teraz',
      desc: 'Wyzwania dostępne dzisiaj dla graczy.',
      empty: 'Brak aktywnych wyzwań na dziś.',
      items: sortedChallenges.filter(ch => !ch.disabled && (ch.date || '') === todayStr),
    },
    {
      id: 'scheduled',
      title: 'Zaplanowane',
      desc: 'Wyzwania przygotowane na przyszłe dni.',
      empty: 'Brak zaplanowanych wyzwań.',
      items: sortedChallenges.filter(ch => (ch.date || '') > todayStr),
    },
    {
      id: 'history',
      title: 'Historyczne',
      desc: 'Wyzwania z poprzednich dni oraz wyłączone pozycje.',
      empty: 'Brak historycznych wyzwań.',
      items: [...sortedChallenges]
        .filter(ch => (ch.date || '') < todayStr || (ch.disabled && (ch.date || '') === todayStr))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    },
  ];

  const renderChallengeRows = (items, emptyMessage) => {
    if (items.length === 0) {
      return (
        <tr>
          <td className="admin-challenge-empty-row" colSpan="6">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return items.map((ch) => {
      const status = getChallengeStatus(ch);
      return (
        <tr key={ch.id}>
          <td className="admin-challenge-table__date">{ch.date || 'Brak daty'}</td>
          <td>
            <div className="admin-challenge-table__challenge">
              {ch.imageUrl ? (
                <img className="admin-challenge-table__thumb" src={ch.imageUrl} alt="" />
              ) : (
                <span className={`admin-challenge-table__icon line-icon line-icon--${ch.icon || 'target'}`} aria-hidden="true" />
              )}
              <div>
                <strong>{ch.title || 'Bez tytułu'}</strong>
                <span>{ch.description || 'Brak opisu'}</span>
              </div>
            </div>
          </td>
          <td>{gameModeLabels[ch.gameMode] || ch.gameMode || 'Nieznany tryb'}</td>
          <td>{Number(ch.rounds) || 0} rund / {Number(ch.timeLimit) || 0}s</td>
          <td>
            <span className={`admin-challenge-status admin-challenge-status--${status.type}`}>
              {status.label}
            </span>
          </td>
          <td>
            <div className="admin-challenge-actions">
              <button className="btn-secondary btn-sm" type="button" onClick={() => handleStartEdit(ch)}>
                Edytuj
              </button>
              <button className="btn-secondary btn-sm" type="button" onClick={() => handleToggleDisable(ch)}>
                {ch.disabled ? 'Włącz' : 'Wyłącz'}
              </button>
              <button className="btn-danger btn-sm" type="button" onClick={() => handleDeleteChallenge(ch.id)}>
                Usuń
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  if (!user.authReady) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge">WERYFIKACJA ADMINISTRATORA</div>
          <h1 className="admin-title text-display">Sprawdzanie uprawnień</h1>
          <p className="admin-subtitle">Weryfikuję sesję Firebase Auth.</p>
        </div>
      </div>
    );
  }

  // State Gatekeeper 1: Not logged in
  if (!user.isLoggedIn) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge">WERYFIKACJA ADMINISTRATORA</div>
          <h1 className="admin-title text-display">Panel Administracyjny</h1>
          <p className="admin-subtitle">
            Dostęp do zarządzania kontami Bolters wymaga zalogowania autoryzowanym kontem Google Administratora.
          </p>

          {actionStatus && (
            <div className={`admin-alert admin-alert--${actionStatus.type}`}>
              {actionStatus.message}
            </div>
          )}

          <div className="admin-gsi-wrapper">
            <div ref={googleBtnRef} className="admin-gsi-btn" />
          </div>

          <button
            className="btn-secondary"
            type="button"
            onClick={handlePopupLogin}
            disabled={isSigningIn}
            style={{ marginTop: '1rem' }}
          >
            {isSigningIn ? 'Logowanie...' : 'Zaloguj przez Google'}
          </button>

          <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
            ← Powrót do aplikacji
          </button>
        </div>
      </div>
    );
  }

  // State Gatekeeper 2: Logged in, but missing Firebase custom claim admin=true
  if (!user.isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge admin-badge--danger">BRAK UPRAWNIEŃ</div>
          <h1 className="admin-title text-display">Odmowa Dostępu</h1>
          <p className="admin-subtitle">
            To konto nie ma aktywnego uprawnienia administratora w Firebase Auth.
          </p>
          <p className="admin-info-note">
            Dostęp do panelu wymaga custom claim <code>admin=true</code> nadanego po stronie backendu.
          </p>


          <div className="admin-actions-row" style={{ marginTop: '1.5rem', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={handleRefreshAdminClaim}>
              Odśwież uprawnienia
            </button>
            <button className="btn-primary" onClick={() => user.logout()}>
              Zaloguj na inne konto
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              ← Wróć do gry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Authorized Admin Panel UI
  return (
    <div className="admin-layout animate-fade-in">
      {/* Top Header Bar */}
      <header className="admin-header glass-card">
        <div className="admin-header__left">
          <div className="admin-badge">PANEL ADMINISTRATORA</div>
          <h1 className="admin-header__title">Panel Administracyjny SPOTASTREET</h1>
        </div>

        <div className="admin-header__right">
          <div className="admin-user-pill">
            <span className="admin-user-pill__avatar line-icon line-icon--user" aria-hidden="true" />
            <div className="admin-user-pill__info">
              <span className="admin-user-pill__name">{user.name || 'Admin'}</span>
              <span className="admin-user-pill__email">{maskEmail(user.email)}</span>
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/')}>
            Przejdź do gry
          </button>
          <button className="btn-danger btn-sm" onClick={() => user.logout()}>
            Wyloguj
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="admin-main">
        {/* Status Alerts */}
        {actionStatus && (
          <div className={`admin-alert admin-alert--${actionStatus.type} animate-fade-in`}>
            <span>{actionStatus.message}</span>
            <button className="admin-alert__close" onClick={() => setActionStatus(null)} aria-label="Zamknij">
              <span className="line-icon line-icon--close" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="admin-tabs glass-card">
          <button 
            className={`admin-tab-btn ${activeTab === 'users' ? 'admin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="line-icon line-icon--user" aria-hidden="true" />
            Użytkownicy i Statystyki
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'challenges' ? 'admin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            <span className="line-icon line-icon--target" aria-hidden="true" />
            Wyzwania Codzienne
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'settings' ? 'admin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Ustawienia aplikacji
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            {/* Stats Overview */}
            <div className="admin-stats-grid">
              <div className="admin-stat-box glass-card">
                <div className="admin-stat-box__icon"><span className="line-icon line-icon--user" aria-hidden="true" /></div>
                <div className="admin-stat-box__data">
                  <span className="admin-stat-box__value">{allUsers.length}</span>
                  <span className="admin-stat-box__label">Aktywne Konta</span>
                </div>
              </div>

              <div className="admin-stat-box glass-card">
                <div className="admin-stat-box__icon"><span className="line-icon line-icon--settings" aria-hidden="true" /></div>
                <div className="admin-stat-box__data">
                  <span className="admin-stat-box__value">{cloudProfiles.length}</span>
                  <span className="admin-stat-box__label">Zapisane w Chmurze</span>
                </div>
              </div>

              <div className="admin-stat-box glass-card">
                <div className="admin-stat-box__icon"><span className="line-icon line-icon--target" aria-hidden="true" /></div>
                <div className="admin-stat-box__data">
                  <span className="admin-stat-box__value">Aktywny</span>
                  <span className="admin-stat-box__label">Status Autoryzacji</span>
                </div>
              </div>
            </div>

            {/* User Management Section */}
            <section className="admin-section glass-card">
              <div className="admin-section__header">
                <div>
                  <h2 className="admin-section__title">Lista Aktywnych Użytkowników</h2>
                  <p className="admin-section__desc">Możliwość podglądu oraz natychmiastowego usuwania kont z bazy danych.</p>
                </div>

                <div className="admin-section__actions">
                  <input 
                    type="text" 
                    className="admin-search-input"
                    placeholder="Szukaj po nazwie, emailu lub mieście..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="btn-secondary" onClick={loadProfiles} title="Odśwież listę kont">
                    Odśwież
                  </button>
                </div>
              </div>

              <div className="admin-table-wrapper">
                {loading ? (
                  <div className="admin-loading-state">
                    <div className="admin-spinner"></div>
                    <p>Pobieranie kont z bazy danych...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Brak kont spełniających kryteria wyszukiwania.</p>
                  </div>
                ) : (
                  <div className="admin-user-grid">
                    {filteredUsers.map((u, idx) => {
                      const isSelf = u.email.toLowerCase().trim() === user.email?.toLowerCase()?.trim();
                      const stats = getUserStatsTotals(u);
                      return (
                        <article key={`${u.email}-${idx}`} className={`admin-user-card ${isSelf ? 'admin-user-card--self' : ''}`}>
                          <div className="admin-user-card__top">
                            <div className="admin-user-card__avatar">
                              {getAvatarImage(u) ? (
                                <img src={getAvatarImage(u)} alt="" />
                              ) : (
                                <span className="line-icon line-icon--user" aria-hidden="true" />
                              )}
                            </div>
                            <div className="admin-user-card__identity">
                              <div className="admin-user-card__name">
                                {u.name}
                                {isSelf && <span className="tag-self">Ty</span>}
                              </div>
                              <code className="table-email">{maskEmail(u.email)}</code>
                            </div>
                            {u.isPremium && <span className="badge-premium-pill">PREMIUM</span>}
                          </div>

                          <div className="admin-user-card__meta">
                            <span>{u.town}</span>
                            <span>{u.hideEmail ? 'Email ukryty' : 'Email widoczny'}</span>
                            <span className="table-source-tag">{u.source}</span>
                          </div>

                          <div className="admin-user-card__stats">
                            <div>
                              <strong>{stats.singleWins}</strong>
                              <span>wygrane</span>
                            </div>
                            <div>
                              <strong>{stats.singleLosses}</strong>
                              <span>porażki</span>
                            </div>
                            <div>
                              <strong>{stats.challengesCount}</strong>
                              <span>wyzwania</span>
                            </div>
                            <div>
                              <strong>{stats.onlineTotal}</strong>
                              <span>online</span>
                            </div>
                          </div>

                          <div className="admin-user-card__actions">
                            <button className="btn-primary btn-sm" onClick={() => openUserEditor(u)}>
                              Edytuj profil
                            </button>
                            <button 
                              className={u.isPremium ? "btn-secondary btn-sm" : "btn-secondary btn-sm btn-green-soft"}
                              onClick={() => handleTogglePremium(u.email, u.isPremium)}
                            >
                              {u.isPremium ? 'Odbierz Premium' : 'Nadaj Premium'}
                            </button>
                            <button 
                              className="btn-danger btn-sm"
                              onClick={() => setDeletingEmail(u.email)}
                              title={`Usuń konto ${maskEmail(u.email)}`}
                            >
                              Usuń
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeTab === 'challenges' ? (
          <div className="admin-challenges-container admin-challenges-container--table">
            <section className="admin-section glass-card admin-challenges-overview">
              <div className="admin-section__header admin-challenges-toolbar">
                <div>
                  <h2 className="admin-section__title">Wyzwania codzienne</h2>
                  <p className="admin-section__desc">Tabela wyzwań podzielona na aktywne, zaplanowane i historyczne.</p>
                </div>
                <div className="admin-challenges-actions">
                  <button type="button" className="btn-primary" onClick={openChallengeCreator}>
                    Stwórz nowe
                  </button>
                  <button type="button" className="btn-secondary" onClick={loadChallengesList}>
                    Odśwież
                  </button>
                </div>
              </div>

              {loadingChallenges ? (
                <div className="admin-loading-state">
                  <div className="admin-spinner"></div>
                  <p>Wczytywanie wyzwań...</p>
                </div>
              ) : challenges.length === 0 ? (
                <div className="admin-empty-state">
                  <p>Brak wyzwań codziennych. Stwórz pierwsze wyzwanie przyciskiem powyżej.</p>
                </div>
              ) : (
                <div className="admin-challenge-groups">
                  {challengeGroups.map(group => (
                    <section className="admin-challenge-group" key={group.id}>
                      <div className="admin-challenge-group__header">
                        <div>
                          <h3>{group.title}</h3>
                          <p>{group.desc}</p>
                        </div>
                        <span>{group.items.length}</span>
                      </div>
                      <div className="admin-challenge-table-wrap">
                        <table className="admin-challenge-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Wyzwanie</th>
                              <th>Tryb</th>
                              <th>Rundy</th>
                              <th>Status</th>
                              <th>Akcje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderChallengeRows(group.items, group.empty)}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>

            {challengeEditorOpen && (
              <section className="admin-section glass-card admin-challenge-editor-panel">
                <div className="admin-section__header admin-challenge-editor-header">
                  <div>
                    <h2 className="admin-section__title">
                      {editingChallengeId ? 'Edycja wyzwania' : 'Nowe wyzwanie'}
                    </h2>
                    <p className="admin-section__desc">
                      {editingChallengeId ? 'Zmień ustawienia wybranego wyzwania.' : 'Utwórz wyzwanie i zaplanuj jego datę publikacji.'}
                    </p>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={handleCancelEdit}>
                    Zamknij
                  </button>
                </div>

                <form onSubmit={handleCreateChallenge} className="admin-challenge-form">
                  <div className="form-row">
                    <div className="form-group flex-2">
                      <label>Tytuł wyzwania *</label>
                      <input
                        type="text"
                        placeholder="np. Znawca Dzielnicy Cudów"
                        value={challengeTitle}
                        onChange={(e) => setChallengeTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>Ikona liniowa</label>
                      <input
                        type="text"
                        placeholder="np. target, pin, scan"
                        value={challengeIcon}
                        onChange={(e) => setChallengeIcon(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Opis / Podtytuł wyzwania</label>
                    <input
                      type="text"
                      placeholder="np. Henryk byłby dumny"
                      value={challengeDesc}
                      onChange={(e) => setChallengeDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tryb rozgrywki</label>
                      <select value={challengeGameMode} onChange={(e) => setChallengeGameMode(e.target.value)}>
                        <option value="where-is-street">Gdzie jest ta ulica? (pinezka)</option>
                        <option value="where-is-place">Gdzie jest to miejsce? (miejsca)</option>
                        <option value="what-street">Co to za ulica? (quiz 4 opcje)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Liczba rund</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={challengeRounds}
                        onChange={(e) => setChallengeRounds(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Czas na rundę (sekund)</label>
                      <input
                        type="number"
                        min="3"
                        max="60"
                        value={challengeTimeLimit}
                        onChange={(e) => setChallengeTimeLimit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-2">
                      <label>Zaplanowana data *</label>
                      <input
                        type="date"
                        value={challengeDate}
                        onChange={(e) => setChallengeDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group flex-2 admin-checkbox-field">
                      <label className="form-checkbox-label">
                        <input
                          type="checkbox"
                          checked={challengeDisabled}
                          onChange={(e) => setChallengeDisabled(e.target.checked)}
                        />
                        Wyzwanie wyłączone / zablokowane
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Zdjęcie wyzwania</label>
                    <div className="admin-challenge-image-row">
                      <input type="file" accept="image/*" onChange={handleImageFileChange} />
                      <input
                        type="text"
                        placeholder="Lub wpisz bezpośredni URL do obrazka..."
                        value={challengeImageUrl}
                        onChange={(e) => setChallengeImageUrl(e.target.value)}
                      />
                    </div>
                    {challengeImageUrl && (
                      <div className="admin-challenge-preview">
                        <span>Podgląd miniatury:</span>
                        <img src={challengeImageUrl} alt="Podgląd wyzwania" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Lista nazw ulic lub kultowych miejsc</label>
                    <textarea
                      rows="6"
                      placeholder="np.&#10;Kamienna&#10;Partyzantów&#10;Henryka Pobożnego"
                      value={challengeStreets}
                      onChange={(e) => setChallengeStreets(e.target.value)}
                    />
                  </div>

                  <div className="admin-challenge-form-actions">
                    <button type="submit" className="btn-primary">
                      {editingChallengeId ? 'Zapisz zmiany' : 'Zaplanuj wyzwanie'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                      Anuluj
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        ) : (
          <section className="admin-section glass-card">
            <div className="admin-section__header">
              <div>
                <h2 className="admin-section__title">Ustawienia aplikacji</h2>
                <p className="admin-section__desc">Globalne przełączniki funkcji widoczne dla użytkowników aplikacji.</p>
              </div>
            </div>

            <div className="admin-settings-list">
              <div className="admin-feature-toggle">
                <div className="admin-feature-toggle__main">
                  <span className="admin-feature-toggle__icon line-icon line-icon--pin" aria-hidden="true" />
                  <div>
                    <h3>Mapa rozegranych rund w podsumowaniu pojedynku</h3>
                    <p>
                      Po wyłączeniu podsumowanie multiplayera pokaże tylko wynik i listę rund, bez mapy z numerami rund.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`admin-switch ${appSettings.summaryMapEnabled ? 'admin-switch--on' : ''}`}
                  onClick={handleToggleSummaryMap}
                  aria-pressed={appSettings.summaryMapEnabled}
                >
                  <span className="admin-switch__thumb" />
                  <span className="admin-switch__label">
                    {appSettings.summaryMapEnabled ? 'Włączona' : 'Wyłączona'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deletingEmail && (
        <div className="admin-modal-overlay animate-fade-in">
          <div className="admin-modal glass-card animate-scale-in">
            <div className="admin-modal__header">
              <span className="admin-modal__icon line-icon line-icon--alert" aria-hidden="true" />
              <h3>Potwierdzenie usunięcia konta</h3>
            </div>
            <div className="admin-modal__body">
              <p>Czy na pewno chcesz usunąć konto użytkownika?</p>
              <div className="admin-modal__user-box">
                <code>{deletingEmail}</code>
              </div>
              <p className="admin-modal__warning">
                Operacja usunie konto z bazy Firestore oraz pamięci podręcznej. Akcja jest nieodwracalna.
              </p>
            </div>
            <div className="admin-modal__footer">
              <button className="btn-secondary" onClick={() => setDeletingEmail(null)}>
                Anuluj
              </button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                Tak, usuń konto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Editor Modal */}
      {editingUser && userDraft && (
        <div className="admin-modal-overlay animate-fade-in">
          <div className="admin-modal admin-user-editor glass-card animate-scale-in">
            <div className="admin-modal__header">
              <span className="admin-modal__icon line-icon line-icon--user" aria-hidden="true" />
              <div>
                <h3>Edytuj profil użytkownika</h3>
                <code className="admin-editor-email">{maskEmail(userDraft.email)}</code>
              </div>
            </div>

            <div className="admin-editor-layout">
              <aside className="admin-editor-side">
                <div className="admin-editor-photo">
                  {getAvatarImage(userDraft) ? (
                    <img src={getAvatarImage(userDraft)} alt="" />
                  ) : (
                    <span className="line-icon line-icon--user" aria-hidden="true" />
                  )}
                </div>
                <label className="btn-secondary btn-sm admin-file-btn">
                  Wgraj zdjęcie
                  <input type="file" accept="image/*" onChange={handleUserPhotoChange} />
                </label>
                {userDraft.customAvatar && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setUserDraft(prev => ({ ...prev, customAvatar: null }))}
                  >
                    Usuń zdjęcie
                  </button>
                )}
              </aside>

              <div className="admin-editor-main">
                <div className="admin-editor-grid">
                  <div className="form-group">
                    <label>Nazwa użytkownika</label>
                    <input
                      type="text"
                      value={userDraft.name}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Miejscowość</label>
                    <input
                      type="text"
                      value={userDraft.town}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, town: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Avatar aplikacji</div>
                  <div className="admin-avatar-picker">
                    {AVATARS.map(avatar => (
                      <button
                        key={avatar.id}
                        className={`admin-avatar-option ${userDraft.avatarId === avatar.id ? 'admin-avatar-option--active' : ''}`}
                        onClick={() => setUserDraft(prev => ({ ...prev, avatarId: avatar.id, customAvatar: null }))}
                        title={avatar.name}
                      >
                        {avatar.image ? (
                          <img src={avatar.image} alt={avatar.name} />
                        ) : (
                          <span>{avatar.emoji}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-editor-toggles">
                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={userDraft.hideEmail}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, hideEmail: e.target.checked }))}
                    />
                    <span>Ukryj adres email w widokach publicznych</span>
                  </label>
                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={userDraft.isPremium}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, isPremium: e.target.checked }))}
                    />
                    <span>Konto Premium</span>
                  </label>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Statystyki</div>
                  <div className="admin-editor-stats">
                    {Object.entries(userDraft.stats || {}).map(([mode, values]) => (
                      <div key={mode}>
                        <span>{mode}</span>
                        <strong>{values?.wins || 0}W / {values?.losses || 0}L</strong>
                      </div>
                    ))}
                    <div>
                      <span>online</span>
                      <strong>{userDraft.onlineWins}W / {userDraft.onlineLosses}L / {userDraft.onlineDraws}D</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Reset wyzwania</div>
                  <div className="admin-reset-row">
                    <select value={resetChallengeId} onChange={(e) => setResetChallengeId(e.target.value)}>
                      <option value="">Wszystkie zapisane wyzwania</option>
                      {Object.entries(userDraft.challengeAttempts || {}).map(([id, score]) => (
                        <option key={id} value={id}>{id} · {score} pkt</option>
                      ))}
                    </select>
                    <button className="btn-secondary btn-sm" onClick={handleResetUserChallenge}>
                      Resetuj
                    </button>
                  </div>
                  <div className="admin-challenge-attempts">
                    {Object.keys(userDraft.challengeAttempts || {}).length === 0 ? (
                      <span>Brak zapisanych podejść.</span>
                    ) : (
                      Object.entries(userDraft.challengeAttempts || {}).map(([id, score]) => (
                        <span key={id}>{id}: {score} pkt</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal__footer admin-editor-footer">
              <button
                className="btn-danger"
                onClick={() => {
                  const targetEmail = userDraft.email;
                  closeUserEditor();
                  setDeletingEmail(targetEmail);
                }}
              >
                Usuń konto
              </button>
              <div className="admin-editor-footer__right">
                <button className="btn-secondary" onClick={closeUserEditor}>
                  Anuluj
                </button>
                <button className="btn-primary" onClick={handleSaveUserProfile}>
                  Zapisz profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
