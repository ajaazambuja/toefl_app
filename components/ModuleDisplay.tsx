
import React, { useState, useEffect, useCallback } from 'react';
import { MultipleChoiceQuestion, ListeningTask, ReadingTask, ModuleType, AnswerFeedback, DifficultyLevel, UserAnswerData } from '../types';
import { generateMcqQuestions, generateListeningTask, generateReadingTask } from '../services/geminiService';
import { useSpeechSynthesis } from '../hooks/useSpeechApi';
import { SpeakerWaveIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from './common/Icons';

interface ModuleDisplayProps {
  moduleType: ModuleType.GRAMMAR | ModuleType.VOCABULARY | ModuleType.LISTENING | ModuleType.READING;
  initialDifficulty: DifficultyLevel;
  onDifficultyChange: (newDifficulty: DifficultyLevel) => void;
  onModuleComplete: (score: number, totalQuestions: number, completedDifficulty: DifficultyLevel, incorrectAnswers: UserAnswerData[]) => void;
  userContextText?: string | null; // New prop for user-provided context
}

const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6 p-6 bg-slate-800 rounded-lg">
    <div className="h-8 bg-slate-700 rounded w-3/4"></div>
    <div className="space-y-3">
      <div className="h-6 bg-slate-700 rounded w-full"></div>
      <div className="h-6 bg-slate-700 rounded w-5/6"></div>
      <div className="h-6 bg-slate-700 rounded w-full"></div>
      <div className="h-6 bg-slate-700 rounded w-4/6"></div>
    </div>
    <div className="h-10 bg-slate-700 rounded w-1/4 mt-4"></div>
  </div>
);

const ModuleDisplay: React.FC<ModuleDisplayProps> = ({ moduleType, initialDifficulty, onDifficultyChange, onModuleComplete, userContextText }) => {
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [passageOrScript, setPassageOrScript] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [showExplanation, setShowExplanation] = useState(false);
  const [incorrectAnswersThisSet, setIncorrectAnswersThisSet] = useState<UserAnswerData[]>([]);

  const { speak, cancel, isSpeaking, supported: ttsSupported } = useSpeechSynthesis();

  const fetchContent = useCallback(async (difficulty: DifficultyLevel, contextText: string | null | undefined) => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowExplanation(false);
    setIncorrectAnswersThisSet([]);

    try {
      if (moduleType === ModuleType.GRAMMAR || moduleType === ModuleType.VOCABULARY) {
        const fetchedQuestions = await generateMcqQuestions(moduleType, difficulty, 5, contextText);
        setQuestions(fetchedQuestions);
        setPassageOrScript(null);
      } else if (moduleType === ModuleType.LISTENING) {
        const task = await generateListeningTask(difficulty, contextText);
        setPassageOrScript(task.script);
        setQuestions(task.questions);
      } else if (moduleType === ModuleType.READING) {
        const task = await generateReadingTask(difficulty, contextText);
        setPassageOrScript(task.text);
        setQuestions(task.questions);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to load ${moduleType} content. ${contextText ? "Ensure your provided text is suitable for this module or try clearing the context." : "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  }, [moduleType]); // Removed userContextText from here, will be in useEffect deps

  useEffect(() => {
    fetchContent(currentDifficulty, userContextText);
  }, [fetchContent, currentDifficulty, userContextText]); // Added userContextText to dependency array
  
  useEffect(() => {
    if(initialDifficulty !== currentDifficulty) {
      setCurrentDifficulty(initialDifficulty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDifficulty]);


  const handleAnswerSubmit = (selectedIndex: number) => {
    if (feedback) return; 

    const currentQ = questions[currentQuestionIndex];
    setSelectedAnswer(selectedIndex);
    const isCorrect = selectedIndex === currentQ.correctAnswerIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
        const incorrectDetail: UserAnswerData = {
            questionId: currentQ.id,
            questionText: currentQ.questionText,
            userAnswer: currentQ.options[selectedIndex],
            correctAnswer: currentQ.options[currentQ.correctAnswerIndex],
            explanation: currentQ.explanation
        };
        setIncorrectAnswersThisSet(prev => [...prev, incorrectDetail]);
    }
    setFeedback({
      isCorrect,
      correctAnswer: currentQ.options[currentQ.correctAnswerIndex],
      explanation: currentQ.explanation,
    });
    setShowExplanation(false); 
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onModuleComplete(score, questions.length, currentDifficulty, incorrectAnswersThisSet);
      const newDifficultySuggestion = calculateNewDifficulty(score, questions.length, currentDifficulty);
      onDifficultyChange(newDifficultySuggestion); 
    }
  };

  const calculateNewDifficulty = (currentScore: number, total: number, oldDifficulty: DifficultyLevel): DifficultyLevel => {
    const percentage = total > 0 ? (currentScore / total) * 100 : 0;
    if (percentage >= 80) { 
      return oldDifficulty === DifficultyLevel.EASY ? DifficultyLevel.MEDIUM : DifficultyLevel.HARD;
    } else if (percentage <= 40) { 
      return oldDifficulty === DifficultyLevel.HARD ? DifficultyLevel.MEDIUM : DifficultyLevel.EASY;
    }
    return oldDifficulty;
  };

  const handleRetryQuestion = () => {
    setSelectedAnswer(null);
    setFeedback(null);
    setShowExplanation(false);
  };

  const handlePlayScript = () => {
    if (passageOrScript && ttsSupported) {
      if (isSpeaking) {
        cancel();
      } else {
        speak(passageOrScript);
      }
    }
  };

  const handleLoadNewSet = () => {
    onModuleComplete(0, 0, currentDifficulty, []); 
    fetchContent(currentDifficulty, userContextText); 
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div className="text-red-400 p-4">{error} <button onClick={() => fetchContent(currentDifficulty, userContextText)} className="ml-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-white">Retry Load</button></div>;
  if (questions.length === 0 && !isLoading) return <div className="p-4 text-slate-300">No questions available for this module. Try loading a new set, check your connection, or verify your context text if provided.</div>;
  
  if (questions.length === 0) return <LoadingSkeleton />; 

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="p-4 sm:p-6 bg-slate-800 shadow-xl rounded-lg text-slate-100 w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-sky-400 mb-1">{moduleType} Practice - Level: {currentDifficulty.toUpperCase()}</h2>
      {userContextText && <p className="text-xs text-teal-400 mb-2 italic">Practice based on your provided text.</p>}
      <p className="text-sm text-slate-400 mb-4">Question {currentQuestionIndex + 1} of {questions.length} | Score: {score}</p>

      {passageOrScript && (moduleType === ModuleType.LISTENING || moduleType === ModuleType.READING) && (
        <div className="mb-6 p-4 bg-slate-700 rounded-md prose prose-invert max-w-none prose-p:text-slate-200">
          <h3 className="text-lg font-medium text-sky-300 mb-2">
            {moduleType === ModuleType.LISTENING ? "Listening Passage" : "Reading Passage"}
          </h3>
          {moduleType === ModuleType.LISTENING && ttsSupported && (
            <button
              onClick={handlePlayScript}
              disabled={isSpeaking}
              className="mb-3 flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <SpeakerWaveIcon className="mr-2" /> {isSpeaking ? 'Playing...' : 'Play Audio Script'}
            </button>
          )}
          <p className="whitespace-pre-line text-slate-200 leading-relaxed">{passageOrScript}</p>
        </div>
      )}

      <div className="mb-6">
        <p className="text-lg text-slate-100 leading-relaxed">{currentQ.questionText}</p>
      </div>

      <div className="space-y-3 mb-6">
        {currentQ.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSubmit(index)}
            disabled={!!feedback}
            className={`block w-full text-left p-3 rounded-md transition-all duration-150 ease-in-out
                        ${selectedAnswer === index ? 
                            (feedback?.isCorrect ? 'bg-green-600 ring-2 ring-green-400' : 'bg-red-600 ring-2 ring-red-400') : 
                            'bg-slate-700 hover:bg-slate-600 focus:bg-sky-600'}
                        ${!!feedback && selectedAnswer !== index && index === currentQ.correctAnswerIndex ? 'ring-2 ring-green-500 bg-green-700' : ''}
                        disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`p-4 rounded-md mb-6 ${feedback.isCorrect ? 'bg-green-700 border-green-500' : 'bg-red-700 border-red-500'} border text-slate-50`}>
          <div className="flex items-center mb-2">
            {feedback.isCorrect ? <CheckCircleIcon className="text-green-300 mr-2 h-7 w-7" /> : <XCircleIcon className="text-red-300 mr-2 h-7 w-7" />}
            <h4 className="text-xl font-semibold">{feedback.isCorrect ? 'Correct!' : 'Incorrect'}</h4>
          </div>
          {!feedback.isCorrect && <p className="mb-1">Correct answer: <span className="font-semibold">{currentQ.options[currentQ.correctAnswerIndex]}</span></p>}
          
          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-sm text-sky-300 hover:text-sky-200 flex items-center mt-2"
          >
            <LightBulbIcon className="mr-1 h-5 w-5" /> {showExplanation ? 'Hide' : 'Show'} Explanation
          </button>
          {showExplanation && <p className="mt-2 text-sm text-slate-200 leading-relaxed">{feedback.explanation}</p>}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        {!feedback && <span className="text-sm text-slate-400">Select an answer.</span>}
        {feedback && (
          <>
            {!feedback.isCorrect ? (
              <button
                onClick={handleRetryQuestion}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md transition-colors"
              >
                Retry Question
              </button>
            ) : <div className="w-auto sm:w-1/3"></div>}
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Set'}
            </button>
          </>
        )}
      </div>
      <button 
        onClick={handleLoadNewSet}
        className="mt-8 w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors"
      >
        Load New Set (Level: {currentDifficulty.toUpperCase()})
      </button>
    </div>
  );
};

export default ModuleDisplay;
