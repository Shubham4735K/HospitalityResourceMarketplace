import React, { useState, useEffect } from 'react';
import { analyzeRequirement } from '../utils/nugenAI.js';

const EXAMPLE_PROMPT =
  'I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space.';

function AIResourceFinderModal({ isOpen, onClose, onApplyCriteria }) {
  const [prompt, setPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUseExample = () => {
    setPrompt(EXAMPLE_PROMPT);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setError('Please describe your requirement first.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeRequirement(prompt);
      if (response && response.data) {
        setAnalysisResult(response);
      } else {
        throw new Error('Received unexpected response format from AI service.');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError(err.message || 'Failed to analyze requirement. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFindMatchingResources = () => {
    if (!analysisResult?.data) return;
    onApplyCriteria(analysisResult.data);
    onClose();
  };

  const structuredData = analysisResult?.data;

  return (
    <div
      className="modal-backdrop ai-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog ai-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-finder-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close AI Resource Finder"
        >
          ✕
        </button>

        <div className="ai-modal-header">
          <div className="ai-modal-icon-badge">✨</div>
          <div>
            <h2 id="ai-finder-title" className="ai-modal-title">
              AI Resource Finder
            </h2>
            <p className="ai-modal-subtitle">Describe what you need</p>
          </div>
        </div>

        <div className="ai-modal-body">
          {/* Example prompt pill */}
          <div className="ai-example-box">
            <span className="ai-example-label">💡 Example prompt:</span>
            <button
              type="button"
              className="ai-example-btn"
              onClick={handleUseExample}
              title="Click to fill example prompt"
            >
              "{EXAMPLE_PROMPT}"
            </button>
          </div>

          {/* Large text input */}
          <div className="ai-input-wrapper">
            <textarea
              className="ai-textarea"
              rows={4}
              placeholder="e.g. I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space."
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError(null);
              }}
              aria-label="Describe what hospitality resource you need"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="ai-error-banner" role="alert">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="ai-action-row">
            <button
              type="button"
              className="btn btn-primary ai-analyze-btn"
              onClick={handleAnalyze}
              disabled={analyzing || !prompt.trim()}
            >
              {analyzing ? (
                <>
                  <span className="ai-spinner" aria-hidden="true" />
                  Analyzing Requirement...
                </>
              ) : (
                'Analyze Requirement'
              )}
            </button>

            {analysisResult && (
              <button
                type="button"
                className="btn btn-secondary ai-reset-btn"
                onClick={() => {
                  setAnalysisResult(null);
                  setError(null);
                }}
              >
                Clear Result
              </button>
            )}
          </div>

          {/* Structured Result Card */}
          {structuredData && (
            <div className="ai-structured-card">
              <div className="ai-card-banner">
                <span className="ai-card-heading">✨ AI UNDERSTANDS</span>
                <span className="ai-source-tag">
                  {analysisResult.isFallback
                    ? 'Isolated Demo Adapter'
                    : 'Nugen Domain-Aligned Model'}
                </span>
              </div>

              <div className="ai-details-grid">
                <div className="ai-field-row">
                  <span className="ai-field-label">Intent</span>
                  <span className="ai-field-value ai-intent-badge">
                    {structuredData.intent || 'FIND_RESOURCE'}
                  </span>
                </div>

                <div className="ai-field-row">
                  <span className="ai-field-label">Resource</span>
                  <span className="ai-field-value ai-highlight-value">
                    {structuredData.category || 'Commercial Kitchen'}
                  </span>
                </div>

                <div className="ai-field-row">
                  <span className="ai-field-label">Capacity</span>
                  <span className="ai-field-value">
                    {structuredData.capacity ? `${structuredData.capacity} guests` : 'Flexible / Unspecified'}
                  </span>
                </div>

                <div className="ai-field-row">
                  <span className="ai-field-label">Date</span>
                  <span className="ai-field-value">
                    {structuredData.date || 'Flexible / Unspecified'}
                  </span>
                </div>

                <div className="ai-field-row">
                  <span className="ai-field-label">Location</span>
                  <span className="ai-field-value">
                    {structuredData.location || 'Any Region'}
                  </span>
                </div>

                <div className="ai-field-row ai-field-row-full">
                  <span className="ai-field-label">Requirements</span>
                  <div className="ai-requirements-list">
                    {Array.isArray(structuredData.requirements) && structuredData.requirements.length > 0 ? (
                      structuredData.requirements.map((req, idx) => (
                        <span key={idx} className="ai-requirement-chip">
                          ✓ {req.charAt(0).toUpperCase() + req.slice(1)}
                        </span>
                      ))
                    ) : (
                      <span className="ai-req-none">No specific equipment constraints parsed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ai-disclaimer">
                <span>
                  ℹ️ Note: AI parses requirement structure only. Actual availability and operating schedules
                  are verified directly against the ResShare provider database.
                </span>
              </div>

              <div className="ai-card-actions">
                <button
                  type="button"
                  className="btn btn-primary ai-find-btn"
                  onClick={handleFindMatchingResources}
                >
                  Find Matching Resources
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIResourceFinderModal;
