import TopNav from '../../components/Navigation/TopNav';

function AdminLayout({ activeTab, actionStatus, children, onAdminTabChange, onClearStatus }) {
  return (
    <div className="admin-layout animate-fade-in">
      <TopNav variant="admin" adminTab={activeTab} onAdminTabChange={onAdminTabChange} />

      <main className="admin-main">
        {actionStatus && (
          <div className={`admin-alert admin-alert--${actionStatus.type} animate-fade-in`}>
            <span>{actionStatus.message}</span>
            <button className="admin-alert__close" onClick={onClearStatus} aria-label="Zamknij">
              <span className="line-icon line-icon--close" aria-hidden="true" />
            </button>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
