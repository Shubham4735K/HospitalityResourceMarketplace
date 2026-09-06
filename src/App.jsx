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

function Hero() {
  return (
    <section className="hero-section">
      <div className="container hero-content">
        <div className="badge badge-amber hero-badge">
          Smart B2B Resource Marketplace
        </div>
        <h1 className="hero-title">
          Share More. <span>Waste Less.</span>
        </h1>
        <p className="hero-subtitle">
          Hospitality businesses can discover and share underused commercial kitchens,
          culinary equipment, banquet venues, and event resources.
        </p>
        <div className="hero-actions">
          <a href="#resources" className="btn btn-primary hero-cta">
            Browse Resources
          </a>
          <div className="hero-meta">
            <span>Verified hospitality resources</span>
            <span>•</span>
            <span>B2B only</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketplaceSection() {
  return (
    <section id="resources" className="marketplace-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Available Resources</h2>
          <p className="section-subtitle">
            Find trusted hospitality resources available from nearby businesses.
          </p>
        </div>

        <div className="catalog-placeholder">
          <p className="placeholder-text">Resource catalog coming next...</p>
        </div>
      </div>
    </section>
  );
}

function App() {
  return (
    <div className="app-layout">
      <Header />
      <main>
        <Hero />
        <MarketplaceSection />
      </main>
    </div>
  );
}

export default App;
