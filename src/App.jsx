import React from 'react';

function Header() {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <a href="#" className="brand-group" aria-label="ResShare Home">
          <div className="brand-logo-mark">R</div>
          <div className="brand-text-container">
            <span className="brand-name">Res<span>Share</span></span>
            <span className="brand-subtitle">Hospitality B2B Exchange</span>
          </div>
        </a>

        <nav aria-label="Primary Navigation">
          <ul className="nav-menu">
            <li>
              <a href="#browse" className="nav-link active">Browse Resources</a>
            </li>
            <li>
              <a href="#requests" className="nav-link">My Requests</a>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button type="button" className="btn btn-primary">
            + List a Resource
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <div className="app-layout">
      <Header />
      <main className="container" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.75rem' }}>Hospitality Resource Exchange</h1>
        <p style={{ maxWidth: '580px', margin: '0 auto', color: 'var(--text-secondary)' }}>
          Header navigation verified (Step 1B-2). Ready for marketplace inventory and resource catalog.
        </p>
      </main>
    </div>
  );
}

export default App;
