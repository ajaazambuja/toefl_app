
import React, { useState, useCallback, useEffect } from 'react';
import { ModuleType, DifficultyLevel, ModuleAttempt, UserAnswerData, IncorrectAnswerDetail } from './types';
import { generateLearningSuggestion, generateSpecificFeedbackForIncorrectAnswers } from './services/geminiService';
import ModuleDisplay from './components/ModuleDisplay';
import PronunciationModule from './components/PronunciationModule';
import { SaveIcon, DocumentTextIcon, XCircleIcon, ArrowPathIcon } from './components/common/Icons';

const formatDateWithTime = (date: Date): string => {
  return date.toLocaleString('en-CA', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  }).replace(',', ''); // Example: 2024-07-04 15:30:00
};

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.HOME);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [moduleCompletionMessage, setModuleCompletionMessage] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [history, setHistory] = useState<ModuleAttempt[]>([]);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | null>(null);
  const [userContextText, setUserContextText] = useState<string | null>(null);
  const [userContextTextRaw, setUserContextTextRaw] = useState<string>("");


  const historyStorageKey = 'toeflAppHistory';
  const userContextTextStorageKey = 'toeflAppUserContextText';
  const MAX_HISTORY_ITEMS = 50;

  useEffect(() => {
    const loadedHistory = localStorage.getItem(historyStorageKey);
    if (loadedHistory) {
      try {
        const parsedHistory = JSON.parse(loadedHistory) as ModuleAttempt[];
        const historyWithPlaceholders = parsedHistory.map(attempt => ({
          ...attempt,
          detailedFeedback: attempt.detailedFeedback?.map(df => ({
            ...df,
            aiTip: df.aiTip || "Tip not available." 
          }))
        }));
        setHistory(historyWithPlaceholders);
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
        localStorage.removeItem(historyStorageKey);
      }
    }

    const loadedContextText = localStorage.getItem(userContextTextStorageKey);
    if (loadedContextText) {
        setUserContextText(loadedContextText);
        setUserContextTextRaw(loadedContextText);
    }
  }, []);

  const handleSetUserContext = () => {
    if (userContextTextRaw.trim()) {
        setUserContextText(userContextTextRaw.trim());
        localStorage.setItem(userContextTextStorageKey, userContextTextRaw.trim());
        alert("Context text set! Modules will now use this text for generating questions.");
    } else {
        alert("Please enter some text to use as context.");
    }
  };

  const handleClearUserContext = () => {
    setUserContextText(null);
    setUserContextTextRaw("");
    localStorage.removeItem(userContextTextStorageKey);
    alert("Context text cleared. Modules will now generate general questions.");
  };


  const addAttemptToHistory = useCallback(async (
    moduleType: ModuleType,
    score: number,
    totalItems: number,
    attemptDifficulty: DifficultyLevel,
    incorrectAnswers: UserAnswerData[] = []
  ) => {
    if (moduleType === ModuleType.HOME) return;

    let initialDetailedFeedback: IncorrectAnswerDetail[] = incorrectAnswers.map(ia => ({
        ...ia,
        aiTip: "Generating tip...",
    }));

    const newAttempt: ModuleAttempt = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      moduleId: moduleType,
      date: new Date().toISOString(),
      score,
      totalItems,
      difficulty: attemptDifficulty,
      percentage: moduleType === ModuleType.PRONUNCIATION 
                    ? score 
                    : (totalItems > 0 ? Math.round((score / totalItems) * 100) : 0),
      learningSuggestion: "Generating suggestion...",
      detailedFeedback: moduleType !== ModuleType.PRONUNCIATION ? initialDetailedFeedback : undefined,
    };

    setHistory(prevHistory => {
      const updatedHistory = [newAttempt, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
      return updatedHistory;
    });

    try {
      const suggestion = await generateLearningSuggestion(moduleType, score, totalItems, attemptDifficulty);
      setHistory(prevHistory => {
        const updatedHistoryWithSuggestion = prevHistory.map(att =>
          att.id === newAttempt.id ? { ...att, learningSuggestion: suggestion } : att
        );
        localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistoryWithSuggestion));
        return updatedHistoryWithSuggestion;
      });
    } catch (error) {
      console.error("Failed to generate learning suggestion for attempt:", newAttempt.id, error);
      setHistory(prevHistory => {
        const updatedHistoryWithError = prevHistory.map(att =>
          att.id === newAttempt.id ? { ...att, learningSuggestion: "Could not generate overall suggestion." } : att
        );
        localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistoryWithError));
        return updatedHistoryWithError;
      });
    }

    if (moduleType !== ModuleType.PRONUNCIATION && incorrectAnswers.length > 0) {
      try {
        const specificTipsData = await generateSpecificFeedbackForIncorrectAnswers(incorrectAnswers);
        setHistory(prevHistory => {
          const updatedHistoryWithSpecificTips = prevHistory.map(attempt => {
            if (attempt.id === newAttempt.id && attempt.detailedFeedback) {
              const updatedDetailedFeedback = attempt.detailedFeedback.map(dfItem => {
                const foundTipData = specificTipsData.find(tip => tip.questionId === dfItem.questionId);
                return { ...dfItem, aiTip: foundTipData ? foundTipData.tip : "Specific tip not available." };
              });
              return { ...attempt, detailedFeedback: updatedDetailedFeedback };
            }
            return attempt;
          });
          localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistoryWithSpecificTips));
          return updatedHistoryWithSpecificTips;
        });
      } catch (error) {
        console.error("Failed to generate specific feedback for attempt:", newAttempt.id, error);
        setHistory(prevHistory => {
           const updatedHistoryWithSpecificError = prevHistory.map(attempt => {
            if (attempt.id === newAttempt.id && attempt.detailedFeedback) {
              const errorDetailedFeedback = attempt.detailedFeedback.map(dfItem => ({
                ...dfItem,
                aiTip: "Error generating specific tip."
              }));
              return { ...attempt, detailedFeedback: errorDetailedFeedback };
            }
            return attempt;
          });
          localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistoryWithSpecificError));
          return updatedHistoryWithSpecificError;
        });
      }
    }
  }, [setHistory]);


  const handleModuleSelect = (module: ModuleType) => {
    setActiveModule(module);
    setModuleCompletionMessage(null); 
  };

  const handleDifficultyChange = useCallback((newDifficulty: DifficultyLevel) => {
    setDifficulty(newDifficulty);
    setModuleCompletionMessage(prev => {
      const difficultyMsg = `Difficulty for next set updated to ${newDifficulty.toUpperCase()}.`;
      return prev ? `${prev} ${difficultyMsg}` : difficultyMsg;
    });
  }, []);

 const handleModuleComplete = useCallback((
    score: number, 
    totalItems: number, 
    completedDifficulty: DifficultyLevel, 
    incorrectAnswers: UserAnswerData[]
  ) => {
     if (totalItems > 0 || activeModule === ModuleType.PRONUNCIATION) { 
        const percentage = activeModule === ModuleType.PRONUNCIATION ? score : Math.round((score / totalItems) * 100);
        if (activeModule === ModuleType.PRONUNCIATION) {
             setModuleCompletionMessage(`Pronunciation set complete! Your average score: ${score}/100.`);
        } else {
            setModuleCompletionMessage(`Module set complete! Your score: ${score}/${totalItems} (${percentage}%).`);
        }
        addAttemptToHistory(activeModule, score, totalItems, completedDifficulty, incorrectAnswers);
    } else if (totalItems === 0 && score === 0 && activeModule !== ModuleType.HOME) { 
        setModuleCompletionMessage(null); 
    }
  }, [activeModule, addAttemptToHistory]);


  const handleClearHistory = () => {
      if (window.confirm("Are you sure you want to clear all your progress history? This action cannot be undone.")) {
        setHistory([]);
        localStorage.removeItem(historyStorageKey);
      }
    };

  const navItems = [
    { name: ModuleType.HOME, icon: "fas fa-home" },
    { name: ModuleType.GRAMMAR, icon: "fas fa-spell-check" },
    { name: ModuleType.VOCABULARY, icon: "fas fa-book-open" },
    { name: ModuleType.LISTENING, icon: "fas fa-headphones-alt" },
    { name: ModuleType.READING, icon: "fas fa-book-reader" },
    { name: ModuleType.PRONUNCIATION, icon: "fas fa-microphone-alt" },
  ];
  
  const originalPromptLabel = "Conceptual Milestone: Initial Version";
  const historyFeatureLabel = "Conceptual Milestone: Progress History & AI Suggestions";
  const detailedFeedbackLabel = "Conceptual Milestone: Enhanced Feedback & Question Variety";
  const contextualLearningPromptDateTime = formatDateWithTime(new Date()); // Uses system time when app runs


  const initialPromptText = `Original Prompt (${originalPromptLabel}):
Estou estudando para a certificação do Toefl, gere um app profissional com módulos de gramática, volcabulário, listening com possibilidade de apresentar o texto e a voz para escutar o texto apresentado, interpretação de texto, pronúncia com a possibilidade de ler uma frase e você analisar a pronúncia apresentando um feedback com uma nota de 0 a 100. Apresente a correção das questões de cada módulo tanto as corretas com as erradas, tem que ter a possibilidade de corrigir ao responder a questão e repetir se o usuário achar necessário. Apresente 5 questões por módulo e ao selecionar de novo o módulo mude as questões e conforme o número de acertos passe para questões com nível mais alto para aperfeiçoar o estudo dos módulos. O fundo do app pode ser escuro.

Enhancement - Progress History & Learning Suggestions (${historyFeatureLabel}):
Implementar um sistema de histórico de progresso. Para cada módulo concluído (Gramática, Vocabulário, Listening, Leitura, Pronúncia), registrar a data, o módulo, a pontuação obtida (ex: 4/5 questões corretas, ou 75/100 para pronúncia), o número total de itens (ex: 5 questões, ou 5 frases para pronúncia), e o nível de dificuldade daquele conjunto de exercícios. Exibir este histórico em uma nova seção ou modal acessível por um botão "Histórico" na navegação principal. Para cada entrada no histórico, gerar e exibir uma sugestão de aprendizado concisa e personalizada (1-2 frases) usando a API Gemini, baseada no desempenho do usuário naquele módulo e nível específicos. A sugestão deve ajudar o usuário a focar em áreas de melhoria ou encorajá-lo se o desempenho for bom. Incluir um botão para limpar todo o histórico (com confirmação).

Enhancement - Prevent Repetition & Detailed Incorrect Answer Feedback (${detailedFeedbackLabel}):
Você está repetindo questões do level easy no level medium, não faça repetição. No histórico tem que ter dicas para as questões que foram informadas que estavam erradas. Lembre que o prompt tem que ser agregados aos prompts já apresentados.
(Implied: Update API prompts to request new/distinct questions. For history, for each incorrect answer in non-pronunciation modules, provide specific AI-generated tips in addition to the overall module suggestion.)

Enhancement - Timestamped Prompts & Contextual Learning from User Text (Implemented on ${contextualLearningPromptDateTime}):
Os prompts tem que ter a data e horário para implementação no botão prompt à medida que forem sendo agregados. Agregue um botão na página principal do app a possibilidade de inserir um texto e, com isso, as questões de todos os módulos (Grammar, Vocabulary, Listening, Reading) tem que estar relacionadas com o texto que está sendo apresentado.
(Implied: Home page UI for text input. Pass context to modules. Update API prompts for question-based modules to use this text context.)`;


  const handleSavePrompt = () => {
    const blob = new Blob([initialPromptText], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'app_creation_prompt_toefl_pro.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const togglePromptModal = () => setShowPromptModal(prev => !prev);
  const toggleHistoryModal = () => setShowHistoryModal(prev => !prev);
  const toggleAccordionItem = (itemId: string) => {
    setActiveAccordionItem(prev => prev === itemId ? null : itemId);
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case ModuleType.HOME:
        return (
          <div className="text-center p-4 sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-sky-400 mb-6">Welcome to TOEFL Prep Pro!</h1>
            
            <div className="my-8 p-6 bg-slate-800 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold text-sky-300 mb-4">Practice with Your Own Text</h2>
              <p className="text-sm text-slate-400 mb-1">Paste your text below. Questions in Grammar, Vocabulary, Listening, and Reading modules will be based on it.</p>
              <p className="text-xs text-slate-500 mb-4"> (For best results, provide a text of at least a few paragraphs.)</p>
              <textarea
                value={userContextTextRaw}
                onChange={(e) => setUserContextTextRaw(e.target.value)}
                placeholder="Paste your text here to generate contextual practice questions..."
                className="w-full h-32 p-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition mb-4"
                aria-label="Enter text for contextual practice"
              ></textarea>
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleSetUserContext}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors"
                >
                  Use This Text for Practice
                </button>
                {userContextText && (
                  <button
                    onClick={handleClearUserContext}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                  >
                    Clear Context Text
                  </button>
                )}
              </div>
              {userContextText && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-md text-left">
                    <p className="text-sm text-sky-200 font-semibold">Active Context:</p>
                    <p className="text-xs text-slate-300 italic truncate">
                        "{userContextText.substring(0, 150)}{userContextText.length > 150 ? '...' : ''}"
                    </p>
                </div>
              )}
            </div>

            <p className="text-lg text-slate-300 mb-4">
              Select your desired starting difficulty level for new modules (this can also be adjusted by performance):
            </p>
            <div className="flex justify-center space-x-2 my-6">
              {(Object.values(DifficultyLevel) as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all duration-150 ease-in-out transform hover:scale-105
                              ${difficulty === level
                                ? 'bg-sky-600 text-white ring-2 ring-sky-300 shadow-lg'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-md'}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-md text-slate-400 mb-8">
              Current default level: <span className="font-semibold text-yellow-400">{difficulty.toUpperCase()}</span>.
            </p>
            <p className="text-lg text-slate-300 mb-4">Select a module to start practicing:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {navItems.filter(item => item.name !== ModuleType.HOME).map(item => (
                <button
                  key={item.name}
                  onClick={() => handleModuleSelect(item.name)}
                  className="bg-slate-700 hover:bg-sky-600 text-slate-100 font-medium py-5 sm:py-6 px-4 rounded-lg shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
                >
                  <i className={`${item.icon} text-2xl sm:text-3xl mb-2 sm:mb-3 text-sky-400`}></i>
                  <span className="block text-lg sm:text-xl">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case ModuleType.GRAMMAR:
      case ModuleType.VOCABULARY:
      case ModuleType.LISTENING:
      case ModuleType.READING:
        return <ModuleDisplay 
                  moduleType={activeModule} 
                  initialDifficulty={difficulty}
                  onDifficultyChange={handleDifficultyChange}
                  onModuleComplete={handleModuleComplete} 
                  userContextText={userContextText}
                />;
      case ModuleType.PRONUNCIATION:
        return <PronunciationModule 
                  initialDifficulty={difficulty}
                  onDifficultyChange={handleDifficultyChange}
                  onModuleComplete={handleModuleComplete}
                  // Pronunciation module currently does not use userContextText for phrase generation
                />;
      default:
        return <div className="text-center p-8">Select a module to begin.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800 shadow-md sticky top-0 z-40">
        <nav className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center">
          <div className="text-2xl font-bold text-sky-400">
            <i className="fas fa-graduation-cap mr-2"></i>TOEFL Prep Pro
          </div>
          <div className="flex space-x-1 sm:space-x-2 items-center mt-2 sm:mt-0 overflow-x-auto pb-2 sm:pb-0">
            {navItems.map(item => (
              <button
                key={item.name}
                onClick={() => handleModuleSelect(item.name)}
                title={item.name}
                className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
                            ${activeModule === item.name 
                              ? 'bg-sky-600 text-white' 
                              : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <i className={`${item.icon} sm:mr-2`}></i>
                <span className="hidden sm:inline">{item.name}</span>
                <span className="sm:hidden">{item.name === ModuleType.HOME ? "Home" : item.name.substring(0,3)}</span>
              </button>
            ))}
             <button
              onClick={toggleHistoryModal}
              title="View Progress History"
              className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="View progress history"
            >
              <i className="fas fa-history sm:mr-2"></i>
              <span className="hidden sm:inline">History</span>
               <span className="sm:hidden">Hist</span>
            </button>
            <button
              onClick={togglePromptModal}
              title="View App Creation Prompt"
              className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="View app creation prompt"
            >
              <DocumentTextIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Prompt</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-4 flex-grow">
        {moduleCompletionMessage && activeModule !== ModuleType.HOME && (
          <div className="mb-4 p-3 bg-blue-600 text-white rounded-md text-center shadow">
            {moduleCompletionMessage}
          </div>
        )}
        {renderActiveModule()}
      </main>

      {showPromptModal && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promptModalTitle"
            onClick={togglePromptModal} 
        >
          <div 
            className="bg-slate-800 p-6 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700 flex-shrink-0">
              <h3 id="promptModalTitle" className="text-xl font-semibold text-sky-400">Prompt Creation & Enhancement</h3>
              <button
                onClick={togglePromptModal}
                className="text-slate-400 hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-slate-700"
                aria-label="Close prompt"
              >
                <XCircleIcon className="w-7 h-7" />
              </button>
            </div>
            <pre className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-700 p-4 rounded-md shadow-inner overflow-y-auto flex-grow mb-4">{initialPromptText}</pre>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-700 flex-shrink-0">
                 <button
                    onClick={handleSavePrompt}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors flex items-center text-sm"
                  >
                    <SaveIcon className="mr-2"/> Save Prompt
                  </button>
                 <button
                    onClick={togglePromptModal}
                    className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm"
                  >
                    Close
                  </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
            role="dialog"
            aria-modal="true"
            aria-labelledby="historyModalTitle"
            onClick={toggleHistoryModal} 
        >
          <div 
            className="bg-slate-800 p-6 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700 flex-shrink-0">
              <h3 id="historyModalTitle" className="text-xl font-semibold text-sky-400">My Progress History</h3>
              <button
                onClick={toggleHistoryModal}
                className="text-slate-400 hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-slate-700"
                aria-label="Close history"
              >
                <XCircleIcon className="w-7 h-7" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-grow mb-4 pr-2 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
              {history.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No history yet. Complete some modules to see your progress!</p>
              ) : (
                <ul className="space-y-4">
                  {history.map(attempt => (
                    <li key={attempt.id} className="p-4 bg-slate-700 rounded-md shadow-md">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-lg font-semibold text-sky-300">{attempt.moduleId}</h4>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(attempt.date).toLocaleDateString()} {new Date(attempt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">
                        Level: <span className="font-medium text-amber-400">{attempt.difficulty.toUpperCase()}</span>
                      </p>
                      <p className="text-sm text-slate-300">
                        Score: <span className="font-medium text-lime-400">
                          {attempt.moduleId === ModuleType.PRONUNCIATION ? `${attempt.score}/100` : `${attempt.score} / ${attempt.totalItems}`}
                          {attempt.percentage !== undefined && attempt.moduleId !== ModuleType.PRONUNCIATION && ` (${attempt.percentage}%)`}
                        </span>
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <p className="text-xs text-sky-500 mb-1 font-semibold">Overall Learning Suggestion:</p>
                        {attempt.learningSuggestion === "Generating suggestion..." ? (
                          <div className="flex items-center text-xs text-slate-400 italic">
                            <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                            <span>Generating...</span>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-200 whitespace-pre-wrap">{attempt.learningSuggestion || "No overall suggestion available."}</p>
                        )}
                      </div>

                      {attempt.detailedFeedback && attempt.detailedFeedback.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                           <button 
                            onClick={() => toggleAccordionItem(`details-${attempt.id}`)}
                            className="text-sm text-sky-400 hover:text-sky-300 font-semibold flex items-center w-full text-left"
                            aria-expanded={activeAccordionItem === `details-${attempt.id}`}
                            aria-controls={`content-details-${attempt.id}`}
                          >
                            <i className={`fas fa-chevron-down mr-2 transition-transform duration-200 ${activeAccordionItem === `details-${attempt.id}` ? 'rotate-180' : ''}`}></i>
                            Detailed Review ({attempt.detailedFeedback.length} incorrect)
                          </button>
                          {activeAccordionItem === `details-${attempt.id}` && (
                            <div id={`content-details-${attempt.id}`} className="mt-2 space-y-3 pl-4 border-l-2 border-slate-500 ml-1">
                              {attempt.detailedFeedback.map((detail, index) => (
                                <div key={`${attempt.id}-detail-${index}`} className="p-3 bg-slate-600 rounded">
                                  <p className="text-xs text-slate-400 italic">Question: "{detail.questionText.substring(0, 50)}..."</p>
                                  <p className="text-sm"><span className="font-semibold text-red-400">Your Answer:</span> {detail.userAnswer}</p>
                                  <p className="text-sm"><span className="font-semibold text-green-400">Correct Answer:</span> {detail.correctAnswer}</p>
                                  <p className="text-xs mt-1"><span className="font-semibold text-slate-300">Explanation:</span> {detail.explanation}</p>
                                  <div className="mt-2 pt-1 border-t border-slate-500">
                                     <p className="text-xs text-teal-400 mb-0.5 font-semibold">AI Tip:</p>
                                    {detail.aiTip === "Generating tip..." ? (
                                      <div className="flex items-center text-xs text-slate-400 italic">
                                        <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
                                        <span>Generating...</span>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{detail.aiTip || "No specific tip available."}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-center flex-shrink-0">
               <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={history.length === 0}
                aria-label="Clear all history"
              >
                Clear History
              </button>
              <button
                onClick={toggleHistoryModal}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-800 text-center p-4 text-sm text-slate-400 border-t border-slate-700">
        <p>&copy; {new Date().getFullYear()} TOEFL Prep Pro. Practice makes perfect!</p>
        <p className="text-xs mt-1">API_KEY Status: {process.env.API_KEY ? 'Loaded' : 'Not Found (AI features may be limited)'}</p>
      </footer>
    </div>
  );
};

export default App;
