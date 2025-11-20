import React, { useState } from 'react';
import { Problem as BaseProblem } from './ProblemList';

interface Problem extends BaseProblem {
  leetcode_link?: string;
  current_interval?: number;
  review_count?: number;
  solution?: string;
}

interface DueTodayFlashcardsProps {
  problems: Problem[];
}

const DueTodayFlashcards: React.FC<DueTodayFlashcardsProps> = ({ problems }) => {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingProblems, setRemainingProblems] = useState(problems);
  const [rememberedCount, setRememberedCount] = useState(0);
  const totalProblems = problems.length;

  // Helper function to get difficulty class (matching script.js)
  const getDifficultyClass = (difficulty: string) => {
    return difficulty.toLowerCase();
  };

  // Update remainingProblems when problems prop changes
  React.useEffect(() => {
    setRemainingProblems(problems);
    setCurrent(0);
    setFlipped(false);
    setCompleted(false);
    setRememberedCount(0);
  }, [problems]);

  if (!remainingProblems || remainingProblems.length === 0) {
    return (
      <div className="flashcard-study-complete">
        <h2>🎉 Well done!</h2>
        <p>You've completed all reviews for today. Great job!</p>
      </div>
    );
  }

  const problem = remainingProblems[current];
  const progress = totalProblems > 0 ? Math.round((rememberedCount / totalProblems) * 100) : 0;

  // Helper function to generate LeetCode URL from problem title
  const generateLeetCodeUrl = (title: string) => {
    // Convert title to LeetCode URL format
    // Example: "Two Sum" -> "two-sum"
    const urlTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
    return `https://leetcode.com/problems/${urlTitle}/`;
  };

  // Safety check to prevent undefined access
  if (!problem) {
    return (
      <div className="flashcard-study-complete">
        <p>No problem data available</p>
      </div>
    );
  }

  // Get LeetCode URL (use existing link or generate one)
  const leetcodeUrl = problem.leetcode_link || generateLeetCodeUrl(problem.title);

  if (false) {
    return (
      <div className="flashcard-study-complete">
        <h2>Loading...</h2>
        <p>Please wait while we load your problems.</p>
      </div>
    );
  }

  const handleFlip = () => setFlipped(f => !f);
  const handlePrev = () => setCurrent(c => (c > 0 ? c - 1 : c));
  const handleNext = () => setCurrent(c => (c < remainingProblems.length - 1 ? c + 1 : c));
  const handleShuffle = () => {
    const idx = Math.floor(Math.random() * remainingProblems.length);
    setCurrent(idx);
    setFlipped(false);
  };
  const handleRemembered = async () => {
    try {
      const timeSpent = (document.getElementById('flashcardTimeInput') as HTMLInputElement)?.value || '';
      const comment = (document.getElementById('flashcardCommentInput') as HTMLTextAreaElement)?.value || '';
      
      console.log('🔄 Marking as remembered:', { problemId: problem.id, timeSpent, comment });
      
      const response = await fetch(`/api/problems/${problem.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          result: 'remembered', 
          time_spent: timeSpent ? parseInt(timeSpent) : null, 
          notes: comment 
        })
      });
      
      if (response.ok) {
        console.log('✅ Review saved successfully');
        // Increment remembered count
        setRememberedCount(prev => prev + 1);
        
        // Remove the current problem from the list
        const newProblems = remainingProblems.filter((_, index) => index !== current);
        setRemainingProblems(newProblems);
        
        // Clear the input fields
        const timeInput = document.getElementById('flashcardTimeInput') as HTMLInputElement;
        const commentInput = document.getElementById('flashcardCommentInput') as HTMLTextAreaElement;
        if (timeInput) timeInput.value = '';
        if (commentInput) commentInput.value = '';
        
        if (newProblems.length === 0) {
          setCompleted(true);
        } else {
          // Adjust current index if needed
          const newCurrent = current >= newProblems.length ? newProblems.length - 1 : current;
          setCurrent(newCurrent);
          setFlipped(false);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Review failed:', response.status, errorText);
        alert(`Failed to update review status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error marking as remembered:', error);
      alert('Failed to update review status. Please try again.');
    }
  };
  
  const handleForgot = async () => {
    try {
      const timeSpent = (document.getElementById('flashcardTimeInput') as HTMLInputElement)?.value || '';
      const comment = (document.getElementById('flashcardCommentInput') as HTMLTextAreaElement)?.value || '';
      
      console.log('🔄 Marking as forgot:', { problemId: problem.id, timeSpent, comment });
      
      const response = await fetch(`/api/problems/${problem.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          result: 'forgot', 
          time_spent: timeSpent ? parseInt(timeSpent) : null, 
          notes: comment 
        })
      });
      
      if (response.ok) {
        console.log('✅ Review saved successfully');
        // Remove the current problem from the list
        const newProblems = remainingProblems.filter((_, index) => index !== current);
        setRemainingProblems(newProblems);
        
        // Clear the input fields
        const timeInput = document.getElementById('flashcardTimeInput') as HTMLInputElement;
        const commentInput = document.getElementById('flashcardCommentInput') as HTMLTextAreaElement;
        if (timeInput) timeInput.value = '';
        if (commentInput) commentInput.value = '';
        
        if (newProblems.length === 0) {
          setCompleted(true);
        } else {
          // Adjust current index if needed
          const newCurrent = current >= newProblems.length ? newProblems.length - 1 : current;
          setCurrent(newCurrent);
          setFlipped(false);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Review failed:', response.status, errorText);
        alert(`Failed to update review status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error marking as forgot:', error);
      alert('Failed to update review status. Please try again.');
    }
  };

  if (completed) {
    return (
      <div className="flashcard-study-complete">
        <h2>🎉 Well done!</h2>
        <p>You've completed all reviews for today. Great job!</p>
      </div>
    );
  }

  return (
    <>
      <div className="flashcard-header">
        <h1>Due Today</h1>
      </div>
      <div className="flashcard-container">
        <div className="flashcard-study-info">
           <div className="flashcard-card-counter">
             <span>Remembered</span>
             <span id="rememberedCount">{rememberedCount}</span>
             <span>of</span>
             <span id="totalCards">{totalProblems}</span>
           </div>
          <div className="flashcard-progress-container">
            <div className="flashcard-progress-bar">
              <div className="flashcard-progress-fill" id="progressFill" style={{ width: `${progress}%` }}></div>
            </div>
            <span id="progressText">{progress}%</span>
          </div>
        </div>
        <div className={`flashcard${flipped ? ' flipped' : ''}`} id="flashcard" onClick={handleFlip} style={{ cursor: 'pointer' }}>
          <div className="flashcard-front">
            <div className="flashcard-label">
              <a href={leetcodeUrl} target="_blank" rel="noopener noreferrer" className="flashcard-leetcode-link" onClick={e => e.stopPropagation()}>View on LeetCode</a>
            </div>
            <div className="flashcard-content" id="frontContent">{problem.title}</div>
            <div className="flashcard-extra-inputs">
              <label>
                <span className="flashcard-time-label">Time (min):</span>
                <input type="number" min="0" className="flashcard-time-input" id="flashcardTimeInput" onClick={e => e.stopPropagation()} onFocus={e => e.stopPropagation()} />
              </label>
              <label>
                <span className="flashcard-comment-label">Comment:</span>
                <textarea className="flashcard-comment-input" id="flashcardCommentInput" placeholder="Your comment..." onClick={e => e.stopPropagation()} onFocus={e => e.stopPropagation()} />
              </label>
            </div>
            <div className="flashcard-flip-hint"><span>Click to reveal details</span></div>
          </div>
          <div className="flashcard-back">
            <div className="flashcard-label">
              <a href={leetcodeUrl} target="_blank" rel="noopener noreferrer" className="flashcard-leetcode-link" onClick={e => e.stopPropagation()}>View on LeetCode</a>
            </div>
            <div className="flashcard-content" id="backContent">
              {problem.solution && problem.solution.trim() ? (
                <div className="flashcard-solution">
                  <div className="flashcard-solution-header">
                    <h3>💻 Solution</h3>
                  </div>
                  <div className="flashcard-solution-content" style={{ userSelect: 'text' }}>
                    {problem.solution}
                  </div>
                </div>
              ) : (
                <div className="flashcard-no-solution">
                  <div className="flashcard-solution-header">
                    <h3>💻 Solution</h3>
                  </div>
                  <div className="flashcard-no-solution-content">
                    <p>No solution recorded yet.</p>
                    <p>Add your solution in the problem detail view to see it here during review.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flashcard-flip-hint"><span>Click to flip back</span></div>
          </div>
        </div>
         <div className="flashcard-navigation-controls">
           <button className="flashcard-nav-btn" id="prevBtn" title="Previous Problem" onClick={e => { e.stopPropagation(); handlePrev(); }} disabled={current === 0}><span>←</span></button>
           <button className="flashcard-nav-btn" id="nextBtn" title="Next Problem" onClick={e => { e.stopPropagation(); handleNext(); }} disabled={current === remainingProblems.length - 1}><span>→</span></button>
           <button className="flashcard-nav-btn" id="shuffleBtn" title="Shuffle Problems" onClick={e => { e.stopPropagation(); handleShuffle(); }}><span>🔀</span></button>
         </div>
        <div className="flashcard-review-buttons">
          <button className="flashcard-btn flashcard-btn-success" id="rememberedBtn" onClick={e => { e.stopPropagation(); handleRemembered(); }}>Remembered</button>
          <button className="flashcard-btn flashcard-btn-danger" id="forgotBtn" onClick={e => { e.stopPropagation(); handleForgot(); }}>Forgot</button>
        </div>
      </div>
    </>
  );
};

export default DueTodayFlashcards; 