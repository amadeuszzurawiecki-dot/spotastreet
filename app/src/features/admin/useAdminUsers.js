import { useEffect, useMemo, useState } from 'react';
import {
  fetchAllCloudProfiles,
  fetchDailyChallenges,
  resetUserChallengeAttempt,
  updateUserPremiumStatus,
  updateUserProfileByEmail,
} from './adminService';
import { AVATARS } from '../../data/avatars';
import { maskEmail } from '../../utils/privacy';

export function useAdminUsers(user, setActionStatus) {
  const [cloudProfiles, setCloudProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingEmail, setDeletingEmail] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userDraft, setUserDraft] = useState(null);
  const [resetChallengeId, setResetChallengeId] = useState('');
  const [availableChallenges, setAvailableChallenges] = useState([]);

  const loadProfiles = async () => {
    setLoading(true);
    const profiles = await fetchAllCloudProfiles();
    setCloudProfiles(profiles || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user.authReady || !user.isLoggedIn || !user.isAdmin) return;
    loadProfiles();
    fetchDailyChallenges().then(items => setAvailableChallenges(items || [])).catch(() => setAvailableChallenges([]));
  }, [user.authReady, user.isLoggedIn, user.isAdmin]);

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

  const handleSaveUserProfile = async () => {
    if (!userDraft?.email) return;
    const fields = {
      name: userDraft.name.trim() || 'Użytkownik Spotastreet',
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

  const handleTogglePremium = async (email, currentPremium) => {
    setActionStatus({ type: 'info', message: `Zapisywanie statusu Premium dla ${maskEmail(email)}...` });
    try {
      const success = await updateUserPremiumStatus(email, !currentPremium);
      if (success) {
        setActionStatus({ type: 'success', message: `Pomyślnie zmieniono status Premium dla ${maskEmail(email)}!` });

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

  const allUsers = useMemo(() => {
    const profileMap = {};

    cloudProfiles.forEach(p => {
      if (p.email || p.name) {
        const key = (p.email || p.name).toLowerCase().trim();
        profileMap[key] = {
          email: p.email || 'Brak emaila',
          name: p.name || 'Użytkownik Spotastreet',
          town: p.town || 'Legnica',
          avatarId: p.avatarId || '3ddd-1',
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

    Object.values(user.savedProfiles || {}).forEach(p => {
      if (p.email || p.name) {
        const key = (p.email || p.name).toLowerCase().trim();
        profileMap[key] = {
          ...(profileMap[key] || {}),
          email: p.email || profileMap[key]?.email || 'Brak emaila',
          name: p.name || profileMap[key]?.name || 'Użytkownik Spotastreet',
          town: p.town || profileMap[key]?.town || 'Legnica',
          avatarId: p.avatarId || profileMap[key]?.avatarId || '3ddd-1',
          customAvatar: p.customAvatar || profileMap[key]?.customAvatar || null,
          car: p.car || profileMap[key]?.car,
          stats: p.stats || profileMap[key]?.stats || {},
          challengeAttempts: p.challengeAttempts || profileMap[key]?.challengeAttempts || {},
          hideEmail: !!p.hideEmail || !!profileMap[key]?.hideEmail,
          onlineWins: p.onlineWins || profileMap[key]?.onlineWins || 0,
          onlineLosses: p.onlineLosses || profileMap[key]?.onlineLosses || 0,
          onlineDraws: p.onlineDraws || profileMap[key]?.onlineDraws || 0,
          updatedAt: p.updatedAt || profileMap[key]?.updatedAt || null,
          source: profileMap[key] ? 'Chmura + Lokalnie' : 'Lokalnie',
          isPremium: !!p.isPremium || !!profileMap[key]?.isPremium
        };
      }
    });

    if (user.isLoggedIn && user.email) {
      const key = user.email.toLowerCase().trim();
      if (!profileMap[key]) {
        profileMap[key] = {
          email: user.email,
          name: user.name || 'Aktywny Użytkownik',
          town: user.town || 'Legnica',
          avatarId: user.avatarId || '3ddd-1',
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

    return Object.values(profileMap);
  }, [
    cloudProfiles,
    user.savedProfiles,
    user.isLoggedIn,
    user.email,
    user.name,
    user.town,
    user.avatarId,
    user.customAvatar,
    user.car,
    user.stats,
    user.challengeAttempts,
    user.hideEmail,
    user.onlineWins,
    user.onlineLosses,
    user.onlineDraws,
  ]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allUsers.filter(u => {
      const email = u.email || '';
      const name = u.name || '';
      const town = u.town || '';
      return (
        email.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term) ||
        town.toLowerCase().includes(term)
      );
    });
  }, [allUsers, searchTerm]);

  return {
    allUsers,
    closeUserEditor,
    deletingEmail,
    editingUser,
    filteredUsers,
    getAvatarImage,
    handleDeleteConfirm,
    handleResetUserChallenge,
    handleSaveUserProfile,
    handleTogglePremium,
    handleUserPhotoChange,
    loadProfiles,
    loading,
    openUserEditor,
    resetChallengeId,
    searchTerm,
    setDeletingEmail,
    setResetChallengeId,
    setSearchTerm,
    setUserDraft,
    userDraft,
    availableChallenges,
  };
}

export default useAdminUsers;
