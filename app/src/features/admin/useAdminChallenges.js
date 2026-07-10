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
  challengeStartAt: '',
  challengeEndAt: '',
  challengeImageUrl: '',
  challengeDisabled: false,
};

export const gameModeLabels = {
  'where-is-street': 'Wskaż ulicę',
  'where-is-place': 'Gdzie jest to miejsce?',
  'what-street': 'Nazwij ulicę',
};

function formatDateTimeLocal(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultChallengeWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 0, 0);

  return {
    startAt: formatDateTimeLocal(start),
    endAt: formatDateTimeLocal(end),
  };
}

function getLegacyDateWindow(date) {
  if (!date) return { startAt: '', endAt: '' };
  return {
    startAt: `${date}T00:00`,
    endAt: `${date}T23:59`,
  };
}

function getChallengeWindow(challenge) {
  const legacy = getLegacyDateWindow(challenge.date);
  return {
    startAt: challenge.startAt || legacy.startAt,
    endAt: challenge.endAt || legacy.endAt,
  };
}

function getChallengeTimeValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

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
    if (activeTab === 'dashboard' || activeTab === 'challenges') {
      loadChallengesList();
    }
  }, [activeTab, user.authReady, user.isLoggedIn, user.isAdmin]);

  const resetChallengeForm = () => {
    setEditingChallengeId(null);
    setForm(DEFAULT_CHALLENGE_FORM);
  };

  const openChallengeCreator = () => {
    const { startAt, endAt } = getDefaultChallengeWindow();
    resetChallengeForm();
    setForm({
      ...DEFAULT_CHALLENGE_FORM,
      challengeDate: startAt.slice(0, 10),
      challengeStartAt: startAt,
      challengeEndAt: endAt,
    });
    setChallengeEditorOpen(true);
  };

  const handleStartEdit = (ch) => {
    const { startAt, endAt } = getChallengeWindow(ch);
    setEditingChallengeId(ch.id);
    setForm({
      challengeTitle: ch.title,
      challengeDesc: ch.description || '',
      challengeIcon: ch.icon || 'target',
      challengeGameMode: ch.gameMode || 'where-is-street',
      challengeRounds: ch.rounds || 15,
      challengeTimeLimit: ch.timeLimit || 15,
      challengeStreets: (ch.streets || []).join('\n'),
      challengeDate: ch.date || startAt.slice(0, 10),
      challengeStartAt: startAt,
      challengeEndAt: endAt,
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
    if (!form.challengeTitle || !form.challengeStartAt || !form.challengeEndAt) {
      setActionStatus({ type: 'error', message: 'Tytuł oraz początek i koniec wyzwania są wymagane!' });
      return;
    }

    const startMs = getChallengeTimeValue(form.challengeStartAt);
    const endMs = getChallengeTimeValue(form.challengeEndAt);

    if (startMs === null || endMs === null || endMs <= startMs) {
      setActionStatus({ type: 'error', message: 'Koniec wyzwania musi być później niż początek.' });
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
      date: form.challengeStartAt.slice(0, 10),
      startAt: form.challengeStartAt,
      endAt: form.challengeEndAt,
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

  const getChallengeStatus = (challenge) => {
    if (challenge.disabled) return { label: 'Wyłączone', type: 'disabled' };
    const { startAt, endAt } = getChallengeWindow(challenge);
    const startMs = getChallengeTimeValue(startAt);
    const endMs = getChallengeTimeValue(endAt);
    const nowMs = Date.now();

    if (startMs !== null && endMs !== null && startMs <= nowMs && endMs >= nowMs) return { label: 'Aktywne', type: 'active' };
    if (startMs !== null && startMs > nowMs) return { label: 'Zaplanowane', type: 'scheduled' };
    return { label: 'Historyczne', type: 'history' };
  };

  const challengeGroups = useMemo(() => {
    const sortedChallenges = [...challenges].sort((a, b) => {
      const aWindow = getChallengeWindow(a);
      const bWindow = getChallengeWindow(b);
      return (aWindow.startAt || '').localeCompare(bWindow.startAt || '');
    });
    return [
      {
        id: 'active',
        title: 'Aktywne',
        desc: 'Wyzwania dostępne teraz dla graczy.',
        empty: 'Brak aktywnych wyzwań na dziś.',
        items: sortedChallenges.filter(ch => getChallengeStatus(ch).type === 'active'),
      },
      {
        id: 'scheduled',
        title: 'Zaplanowane',
        desc: 'Wyzwania przygotowane na przyszłe dni.',
        empty: 'Brak zaplanowanych wyzwań.',
        items: sortedChallenges.filter(ch => getChallengeStatus(ch).type === 'scheduled'),
      },
      {
        id: 'history',
        title: 'Historyczne',
        desc: 'Wyzwania zakończone i zawieszone',
        empty: 'Brak historycznych wyzwań.',
        items: [...sortedChallenges]
          .filter(ch => ['history', 'disabled'].includes(getChallengeStatus(ch).type))
          .sort((a, b) => {
            const aWindow = getChallengeWindow(a);
            const bWindow = getChallengeWindow(b);
            return (bWindow.startAt || '').localeCompare(aWindow.startAt || '');
          }),
      },
    ];
  }, [challenges]);

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
