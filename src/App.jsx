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

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Discover',
      description:
        'Find available kitchens, venues, equipment, and event resources from nearby hospitality businesses.',
      accent: 'amber',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6M8 11h6" strokeOpacity="0.4" />
        </svg>
      )
    },
    {
      number: '02',
      title: 'Request',
      description:
        'Choose a resource, check its availability, and send your requirements directly to the host business.',
      accent: 'amber',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      )
    },
    {
      number: '03',
      title: 'Collaborate',
      description:
        'Connect businesses, improve resource utilization, and reduce unnecessary hospitality waste.',
      accent: 'emerald',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ];

  return (
    <section className="how-it-works-section" id="how-it-works" aria-label="How ResShare Works">
      <div className="container">
        <div className="how-it-works-header">
          <h2 className="section-title">How ResShare Works</h2>
          <p className="section-subtitle">
            Turn underused hospitality resources into opportunities for collaboration.
          </p>
        </div>

        <div className="how-steps-flow">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className={`how-step-card how-step-${step.accent}`}>
                <div className="how-step-card-glow" aria-hidden="true" />
                <div className="how-step-top">
                  <div className={`how-step-icon-wrap how-step-icon-${step.accent}`}>
                    {step.icon}
                  </div>
                  <span className={`how-step-num how-step-num-${step.accent}`}>
                    {step.number}
                  </span>
                </div>

                <div className="how-step-body">
                  <h3 className="how-step-title">{step.title}</h3>
                  <p className="how-step-desc">{step.description}</p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="how-step-connector" aria-hidden="true">
                  <div className="connector-line-start" />
                  <div className="connector-arrow-box">
                    <svg
                      className="connector-arrow-desktop"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                    <svg
                      className="connector-arrow-mobile"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </div>
                  <div className="connector-line-end" />
                </div>
              )}
            </React.Fragment>
          ))}
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
            <HowItWorks />
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
