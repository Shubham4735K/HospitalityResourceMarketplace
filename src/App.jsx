import React, { useState } from 'react';
import { resources } from './data/resources.js';
import ResourceGrid from './components/ResourceGrid.jsx';
import FilterBar from './components/FilterBar.jsx';
import ResourceDetailModal from './components/ResourceDetailModal.jsx';
import BookingRequestModal from './components/BookingRequestModal.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';

function Header({ activeTab, onSelectTab }) {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <a
          href="#"
          className="brand-group"
          aria-label="ResShare Home"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('marketplace');
          }}
        >
          <div className="brand-logo-mark">R</div>
          <div className="brand-text-container">
            <span className="brand-name">Res<span>Share</span></span>
            <span className="brand-subtitle">Hospitality B2B Exchange</span>
          </div>
        </a>

        <nav className="header-nav" aria-label="Primary Navigation">
          <ul className="nav-menu">
            <li>
              <button
                type="button"
                className={`nav-link ${activeTab === 'marketplace' ? 'active' : ''}`}
                onClick={() => onSelectTab('marketplace')}
              >
                Browse Resources
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => onSelectTab('requests')}
              >
                My Requests
              </button>
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

function MarketplaceSection({ onSelectResource }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Resources');

  const filteredResources = resources.filter((resource) => {
    const matchesCategory =
      selectedCategory === 'All Resources' ||
      resource.category === selectedCategory;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      resource.title.toLowerCase().includes(term) ||
      resource.category.toLowerCase().includes(term) ||
      resource.hostBusiness.toLowerCase().includes(term) ||
      resource.location.toLowerCase().includes(term) ||
      resource.description.toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  const count = filteredResources.length;
  const countLabel = `${count} ${count === 1 ? 'resource' : 'resources'} available`;

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Resources');
  };

  const resourcesWithHandlers = filteredResources.map((item) => ({
    ...item,
    onViewDetails: () => onSelectResource(item)
  }));

  return (
    <section id="resources" className="marketplace-section">
      <div className="container">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Available Resources</h2>
            <p className="section-subtitle">
              Find trusted hospitality resources available from nearby businesses.
            </p>
          </div>
          <div className="results-count-badge">
            {countLabel}
          </div>
        </div>

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {resourcesWithHandlers.length > 0 ? (
          <ResourceGrid resources={resourcesWithHandlers} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">No resources found</h3>
            <p className="empty-state-subtitle">
              Try adjusting your search or category filter.
            </p>
            <button
              type="button"
              className="btn btn-secondary empty-state-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MyRequestsSection({ onBrowseResources }) {
  return (
    <section className="my-requests-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">My Requests</h2>
          <p className="section-subtitle">
            Track and manage your B2B resource inquiries with partner businesses.
          </p>
        </div>

        <div className="my-requests-empty-card">
          <div className="empty-requests-icon">📋</div>
          <h3 className="empty-requests-title">
            Your submitted resource requests will appear here.
          </h3>
          <p className="empty-requests-subtitle">
            Request a resource to start tracking your hospitality collaborations.
          </p>
          <button
            type="button"
            className="btn btn-primary empty-requests-cta"
            onClick={onBrowseResources}
          >
            Browse Resources
          </button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedResource, setSelectedResource] = useState(null);
  const [requestResource, setRequestResource] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const handleOpenRequest = (resource) => {
    setSelectedResource(null);
    setRequestResource(resource);
  };

  const handleSubmitRequest = (formData) => {
    setSubmittedRequest(formData);
    setRequestResource(null);
    setShowConfirmation(true);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setSubmittedRequest(null);
  };

  const handleBrowseResources = () => {
    setActiveTab('marketplace');
  };

  return (
    <div className="app-layout">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} />
      <main>
        {activeTab === 'marketplace' ? (
          <>
            <Hero />
            <MarketplaceSection onSelectResource={setSelectedResource} />
          </>
        ) : (
          <MyRequestsSection onBrowseResources={handleBrowseResources} />
        )}
      </main>

      {/* Step 1: Resource Details Modal */}
      <ResourceDetailModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
        onRequestResource={handleOpenRequest}
      />

      {/* Step 2: Booking Request Modal */}
      <BookingRequestModal
        resource={requestResource}
        onClose={() => setRequestResource(null)}
        onSubmit={handleSubmitRequest}
      />

      {/* Step 3: Request Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        requestData={submittedRequest}
        onClose={handleCloseConfirmation}
      />
    </div>
  );
}

export default App;
