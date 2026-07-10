import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import useGoogleAuth from '../features/auth/useGoogleAuth';
import AdminAccessGate from '../features/admin/AdminAccessGate';
import AdminChallengesPanel from '../features/admin/AdminChallengesPanel';
import AdminDashboardPanel from '../features/admin/AdminDashboardPanel';
import AdminLayout from '../features/admin/AdminLayout';
import AdminSettingsPanel from '../features/admin/AdminSettingsPanel';
import AdminUsersPanel from '../features/admin/AdminUsersPanel';
import useAdminChallenges from '../features/admin/useAdminChallenges';
import useAdminSettings from '../features/admin/useAdminSettings';
import useAdminUsers from '../features/admin/useAdminUsers';
import './AdminPage.css';

export function AdminPage() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const [actionStatus, setActionStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    isSigningIn,
    loginWithCredentialResponse,
    loginWithPopup,
  } = useGoogleAuth({
    onError: (message) => setActionStatus({ type: 'error', message }),
    popupErrorPrefix: 'Błąd logowania kontem Google',
  });

  const adminUsers = useAdminUsers(user, setActionStatus);
  const adminChallenges = useAdminChallenges({ activeTab, user, setActionStatus });
  const {
    appSettings,
    handleToggleSummaryMap,
    loadSettings,
    updateAppSetting,
  } = useAdminSettings(setActionStatus);

  useEffect(() => {
    loadSettings();
  }, []);

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

  return (
    <AdminAccessGate
      actionStatus={actionStatus}
      isSigningIn={isSigningIn}
      loginWithCredentialResponse={loginWithCredentialResponse}
      loginWithPopup={loginWithPopup}
      navigate={navigate}
      onRefreshAdminClaim={handleRefreshAdminClaim}
      setActionStatus={setActionStatus}
      user={user}
    >
      <AdminLayout
        activeTab={activeTab}
        actionStatus={actionStatus}
        onAdminTabChange={setActiveTab}
        onClearStatus={() => setActionStatus(null)}
      >
        {activeTab === 'dashboard' ? (
          <AdminDashboardPanel
            adminChallenges={adminChallenges}
            adminUsers={adminUsers}
            appSettings={appSettings}
            onAdminTabChange={setActiveTab}
          />
        ) : activeTab === 'users' ? (
          <AdminUsersPanel adminUsers={adminUsers} user={user} />
        ) : activeTab === 'challenges' ? (
          <AdminChallengesPanel adminChallenges={adminChallenges} />
        ) : (
          <AdminSettingsPanel
            appSettings={appSettings}
            onToggleSummaryMap={handleToggleSummaryMap}
            onUpdateAppSetting={updateAppSetting}
          />
        )}
      </AdminLayout>
    </AdminAccessGate>
  );
}

export default AdminPage;
