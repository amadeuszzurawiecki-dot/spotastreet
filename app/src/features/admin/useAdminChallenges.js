import { useEffect, useMemo, useState } from 'react';
import {
  deleteDailyChallenge,
  fetchDailyChallenges,
  saveDailyChallenge,
} from './adminService';

const DEFAULT_CHALLENGE_FORM = {
  challengeTitle: '',
  challengeDesc: '',
  challengeIcon: 'target',
  challengeGameMode: 'where-is-street',
  challengeRounds: 15,
  challengeTimeLimit: 15,
  challengeStreets: '',
  challengeDate: '',
  challengeImageUrl: '',
  challengeDisabled: false,
};

export const gameModeLabels = {
  'where-is-street': 'Gdzie jest ta ulica?',
  'where-is-place': 'Gdzie jest to miejsce?',
  'what-street': 'Co to za ulica?',
};

export function useAdminChallenges({ activeTab, user, setActionStatus }) {
  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState(null);
  const [challengeEditorOpen, setChallengeEditorOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_CHALLENGE_FORM);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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

  const resetChallengeForm = () => {
    setEditingChallengeId(null);
    setForm(DEFAULT_CHALLENGE_FORM);
  };

  const openChallengeCreator = () => {
    resetChallengeForm();
    updateForm('challengeDate', new Date().toLocaleDateString('sv-SE'));
    setChallengeEditorOpen(true);
  };

  const handleStartEdit = (ch) => {
    setEditingChallengeId(ch.id);
    setForm({
      challengeTitle: ch.title,
      challengeDesc: ch.description || '',
      challengeIcon: ch.icon || 'target',
      challengeGameMode: ch.gameMode || 'where-is-street',
      challengeRounds: ch.rounds || 15,
      challengeTimeLimit: ch.timeLimit || 15,
      challengeStreets: (ch.streets || []).join('\n'),
      challengeDate: ch.date,
      challengeImageUrl: ch.imageUrl || '',
      challengeDisabled: !!ch.disabled,
    });
    setChallengeEditorOpen(true);
  };

  const closeChallengeEditor = () => {
    resetChallengeForm();
    setChallengeEditorOpen(false);
  };

  const handleCancelEdit = () => {
    resetChallengeForm();
    setChallengeEditorOpen(false);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateForm('challengeImageUrl', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!form.challengeTitle || !form.challengeDate) {
      setActionStatus({ type: 'error', message: 'Tytuł wyzwania oraz Data zaplanowania są wymagane!' });
      return;
    }

    const streetList = form.challengeStreets
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const challengeData = {
      id: editingChallengeId || `challenge_${Date.now()}`,
      title: form.challengeTitle,
      description: form.challengeDesc,
      icon: form.challengeIcon,
      gameMode: form.challengeGameMode,
      rounds: Number(form.challengeRounds),
      timeLimit: Number(form.challengeTimeLimit),
      streets: streetList,
      date: form.challengeDate,
      imageUrl: form.challengeImageUrl || '',
      disabled: form.challengeDisabled,
      createdAt: new Date().toISOString()
    };

    setActionStatus({ type: 'info', message: 'Zapisywanie wyzwania w bazie Firestore...' });
    const success = await saveDailyChallenge(challengeData);
    if (success) {
      setActionStatus({
        type: 'success',
        message: editingChallengeId
          ? `Zaktualizowano wyzwanie "${form.challengeTitle}".`
          : `Wyzwanie "${form.challengeTitle}" zostało utworzone.`
      });
      closeChallengeEditor();
      loadChallengesList();
    } else {
      setActionStatus({ type: 'error', message: 'Nie udało się zapisać wyzwania w chmurze.' });
    }
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

  const todayStr = new Date().toLocaleDateString('sv-SE');

  const getChallengeStatus = (challenge) => {
    if (challenge.disabled) return { label: 'Wyłączone', type: 'disabled' };
    if ((challenge.date || '') === todayStr) return { label: 'Aktywne teraz', type: 'active' };
    if ((challenge.date || '') > todayStr) return { label: 'Zaplanowane', type: 'scheduled' };
    return { label: 'Historyczne', type: 'history' };
  };

  const challengeGroups = useMemo(() => {
    const sortedChallenges = [...challenges].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return [
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
  }, [challenges, todayStr]);

  return {
    challengeEditorOpen,
    challengeGroups,
    challenges,
    editingChallengeId,
    form,
    getChallengeStatus,
    handleCancelEdit,
    handleCreateChallenge,
    handleDeleteChallenge,
    handleImageFileChange,
    handleStartEdit,
    handleToggleDisable,
    loadChallengesList,
    loadingChallenges,
    openChallengeCreator,
    updateForm,
  };
}

export default useAdminChallenges;
