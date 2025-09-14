import React, { useEffect, useState, useMemo } from 'react';
import { reviewApi } from '../services/api';

interface ReviewHistoryTimelineProps {
  problemId: number;
  problemTitle?: string;
  problemDifficulty?: string;
  problemConcept?: string;
}

interface ReviewHistoryEntry {
  id: number;
  review_date: string;
  result: 'remembered' | 'forgot' | 'initial';
  review_stage?: number;
  scheduled_review_time?: string;
  next_review_date?: string;
  time_spent_minutes?: number;
  notes?: string;
  confusion_notes?: string;
  specific_mistakes?: string[];
  is_intensive_recovery?: boolean;
  created_at: string;
}

interface IntensiveRecoveryCycle {
  id: number;
  problem_id: number;
  cycles_remaining: number;
  cycle_interval_days: number;
  started_date: string;
  completed_date?: string;
}

interface ReviewHistoryData {
  success: boolean;
  problem_id: number;
  total_entries: number;
  history: ReviewHistoryEntry[];
  intensive_cycles: IntensiveRecoveryCycle[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface FilterOptions {
  reviewType: 'all' | 'normal' | 'intensive' | 'forgot' | 'remembered';
  dateRange: 'all' | 'week' | 'month' | 'quarter';
}

const ReviewHistoryTimeline: React.FC<ReviewHistoryTimelineProps> = ({ 
  problemId, 
  problemTitle, 
  problemDifficulty, 
  problemConcept 
}) => {
  const [historyData, setHistoryData] = useState<ReviewHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    reviewType: 'all',
    dateRange: 'all'
  });

  // Format date function
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Load review history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await reviewApi.getReviewHistory(problemId);
        
        // Ensure data has the expected structure with default values
        const normalizedData: ReviewHistoryData = {
          success: data?.success ?? true,
          problem_id: data?.problem_id ?? problemId,
          total_entries: data?.total_entries ?? 0,
          history: data?.history ?? [],
          intensive_cycles: data?.intensive_cycles ?? [],
          pagination: data?.pagination ?? {
            limit: 50,
            offset: 0,
            has_more: false
          }
        };
        
        setHistoryData(normalizedData);
      } catch (err) {
        console.error('Failed to load review history:', err);
        setError('Failed to load review history');
        
        // Set default empty data structure on error
        setHistoryData({
          success: false,
          problem_id: problemId,
          total_entries: 0,
          history: [],
          intensive_cycles: [],
          pagination: {
            limit: 50,
            offset: 0,
            has_more: false
          }
        });
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [problemId]);

  // Filter history entries based on current filters
  const filteredHistory = useMemo(() => {
    if (!historyData?.history) return [];

    let filtered = [...historyData.history];

    // Filter by review type
    if (filters.reviewType !== 'all') {
      filtered = filtered.filter(entry => {
        switch (filters.reviewType) {
          case 'normal':
            return !entry.is_intensive_recovery;
          case 'intensive':
            return entry.is_intensive_recovery;
          case 'forgot':
            return entry.result === 'forgot';
          case 'remembered':
            return entry.result === 'remembered';
          default:
            return true;
        }
      });
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(entry => 
        new Date(entry.review_date) >= cutoffDate
      );
    }

    return filtered;
  }, [historyData?.history, filters]);

  // Toggle expanded state for an entry
  const toggleExpanded = (entryId: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Get entry type for styling
  const getEntryType = (entry: ReviewHistoryEntry) => {
    if (entry.result === 'initial') return 'initial';
    if (entry.is_intensive_recovery) return 'intensive';
    return entry.result;
  };

  // Get entry icon
  const getEntryIcon = (entry: ReviewHistoryEntry) => {
    switch (getEntryType(entry)) {
      case 'initial':
        return '🎯';
      case 'remembered':
        return '✅';
      case 'forgot':
        return '❌';
      case 'intensive':
        return '🔥';
      default:
        return '📝';
    }
  };

  // Get stage display
  const getStageDisplay = (stage?: number) => {
    if (!stage) return '';
    const stageNames = {
      1: '1 day',
      2: '3 days', 
      3: '7 days',
      4: '14 days',
      5: '30 days',
      6: '60 days',
      7: '120 days',
      8: '240 days'
    };
    return stageNames[stage as keyof typeof stageNames] || `Stage ${stage}`;
  };

  // Check if entry represents graduation
  const isGraduation = (entry: ReviewHistoryEntry, index: number) => {
    if (index === 0) return false; // Can't be graduation if it's the latest entry
    
    const prevEntry = filteredHistory[index - 1];
    return entry.is_intensive_recovery && 
           prevEntry && 
           !prevEntry.is_intensive_recovery && 
           entry.result === 'remembered';
  };

  if (loading) {
    return (
      <div className="review-history-timeline-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading review history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-history-timeline-container">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="review-history-timeline-container">
        <div className="empty-state">
          <p>No review history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-history-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-title">
          <h2>📊 Review History Timeline</h2>
          <p className="timeline-subtitle">
            {historyData.total_entries} total review{historyData.total_entries !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Problem Info */}
        {problemTitle && (
          <div className="problem-info">
            <h3>{problemTitle}</h3>
            <div className="problem-meta">
              {problemDifficulty && <span className={`difficulty ${problemDifficulty.toLowerCase()}`}>{problemDifficulty}</span>}
              {problemDifficulty && problemConcept && <span className="separator">•</span>}
              {problemConcept && <span className="concept">{problemConcept}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="timeline-filters">
        <div className="filter-group">
          <label>Review Type:</label>
          <select 
            value={filters.reviewType} 
            onChange={(e) => setFilters(prev => ({ ...prev, reviewType: e.target.value as FilterOptions['reviewType'] }))}
          >
            <option value="all">All Reviews</option>
            <option value="normal">Normal Reviews</option>
            <option value="intensive">Intensive Recovery</option>
            <option value="remembered">Remembered</option>
            <option value="forgot">Forgot</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Date Range:</label>
          <select 
            value={filters.dateRange} 
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterOptions['dateRange'] }))}
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last 3 Months</option>
          </select>
        </div>
        
        <div className="filter-results">
          Showing {filteredHistory.length} of {historyData.total_entries} entries
        </div>
      </div>

      {/* Active Recovery Cycles */}
      {historyData.intensive_cycles && historyData.intensive_cycles.some(cycle => !cycle.completed_date) && (
        <div className="active-cycles-section">
          <h3>🔥 Active Recovery Cycles</h3>
          {historyData.intensive_cycles
            .filter(cycle => !cycle.completed_date)
            .map(cycle => (
              <div key={cycle.id} className="active-cycle-card">
                <div className="cycle-info">
                  <span className="cycles-remaining">{cycle.cycles_remaining} cycles remaining</span>
                  <span className="cycle-interval">Every {cycle.cycle_interval_days} day{cycle.cycle_interval_days !== 1 ? 's' : ''}</span>
                </div>
                <div className="cycle-started">
                  Started: {formatDateShort(cycle.started_date)}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Timeline */}
      <div className="review-timeline-enhanced">
        {filteredHistory.length === 0 ? (
          <div className="empty-timeline">
            <p>No reviews match the current filters</p>
          </div>
        ) : (
          filteredHistory.map((entry, index) => {
            const isExpanded = expandedEntries.has(entry.id);
            const entryType = getEntryType(entry);
            const isGraduationEvent = isGraduation(entry, index);
            
            return (
              <div key={entry.id} className={`timeline-entry ${entryType} ${isGraduationEvent ? 'graduation' : ''}`}>
                {/* Timeline connector line */}
                <div className="timeline-connector"></div>
                
                {/* Timeline dot */}
                <div className={`timeline-dot ${entryType}`}>
                  <span className="timeline-icon">{getEntryIcon(entry)}</span>
                </div>
                
                {/* Entry content */}
                <div className={`timeline-content ${entryType}`}>
                  {/* Graduation banner */}
                  {isGraduationEvent && (
                    <div className="graduation-banner">
                      🎉 Graduated from Intensive Recovery!
                    </div>
                  )}
                  
                  {/* Main header */}
                  <div className="timeline-entry-header" onClick={() => toggleExpanded(entry.id)}>
                    <div className="entry-main-info">
                      <div className="entry-date">{formatDate(entry.review_date)}</div>
                      <div className="entry-badges">
                        <span className={`result-badge ${entry.result}`}>
                          {entry.result.charAt(0).toUpperCase() + entry.result.slice(1)}
                        </span>
                        {entry.is_intensive_recovery && (
                          <span className="intensive-badge">Intensive Recovery</span>
                        )}
                        {entry.review_stage && (
                          <span className="stage-badge">
                            {getStageDisplay(entry.review_stage)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="entry-summary">
                      {entry.time_spent_minutes && (
                        <span className="time-spent">{entry.time_spent_minutes}m</span>
                      )}
                      <button className="expand-button">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick details */}
                  <div className="timeline-quick-details">
                    {entry.scheduled_review_time && (
                      <span>Next: {formatDateShort(entry.scheduled_review_time)}</span>
                    )}
                    {entry.next_review_date && (
                      <span>Next: {formatDateShort(entry.next_review_date)}</span>
                    )}
                  </div>
                  
                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="timeline-expanded-details">
                      {entry.notes && (
                        <div className="detail-section">
                          <h4>📝 Notes</h4>
                          <p>{entry.notes}</p>
                        </div>
                      )}
                      
                      {entry.confusion_notes && (
                        <div className="detail-section">
                          <h4>🤔 Confusion Notes</h4>
                          <p>{entry.confusion_notes}</p>
                        </div>
                      )}
                      
                      {entry.specific_mistakes && entry.specific_mistakes.length > 0 && (
                        <div className="detail-section">
                          <h4>⚠️ Specific Mistakes</h4>
                          <ul>
                            {entry.specific_mistakes.map((mistake, idx) => (
                              <li key={idx}>{mistake}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="detail-section">
                        <h4>📊 Review Details</h4>
                        <div className="review-metadata">
                          <div className="metadata-item">
                            <span className="label">Review Stage:</span>
                            <span className="value">{getStageDisplay(entry.review_stage) || 'N/A'}</span>
                          </div>
                          <div className="metadata-item">
                            <span className="label">Time Spent:</span>
                            <span className="value">{entry.time_spent_minutes ? `${entry.time_spent_minutes} minutes` : 'Not recorded'}</span>
                          </div>
                          <div className="metadata-item">
                            <span className="label">Review Type:</span>
                            <span className="value">{entry.is_intensive_recovery ? 'Intensive Recovery' : 'Normal Review'}</span>
                          </div>
                          <div className="metadata-item">
                            <span className="label">Recorded:</span>
                            <span className="value">{formatDate(entry.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Load more button if there are more entries */}
      {historyData?.pagination?.has_more && (
        <div className="load-more-section">
          <button className="load-more-button">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewHistoryTimeline;