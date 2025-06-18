
export enum ModuleType {
  HOME = "Home",
  GRAMMAR = "Grammar",
  VOCABULARY = "Vocabulary",
  LISTENING = "Listening",
  READING = "Reading Comprehension",
  PRONUNCIATION = "Pronunciation",
}

export enum DifficultyLevel {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export interface MultipleChoiceQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ListeningTask {
  id:string;
  script: string;
  questions: MultipleChoiceQuestion[];
}

export interface ReadingTask {
  id: string;
  text: string;
  questions: MultipleChoiceQuestion[];
}

export interface PronunciationPhrase {
  id: string;
  phrase: string;
}

export interface PronunciationFeedback {
  score: number;
  feedbackText: string;
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export interface UserAnswerData {
  questionId: string;
  questionText: string;
  userAnswer: string; // Text of the user's selected option
  correctAnswer: string; // Text of the correct option
  explanation: string;
}

export interface IncorrectAnswerDetail {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  aiTip?: string; // AI generated specific tip for this incorrect answer
}

export interface ModuleAttempt {
  id: string; // Unique ID for the attempt
  moduleId: ModuleType;
  date: string; // ISO string date
  score: number;
  totalItems: number; // For MCQ/Reading/Listening (total questions), for Pronunciation (total phrases)
  difficulty: DifficultyLevel;
  percentage?: number; // Calculated: (score / totalItems) * 100 for MCQ etc., or score for Pronunciation
  learningSuggestion?: string; // AI generated general suggestion for the attempt
  detailedFeedback?: IncorrectAnswerDetail[]; // Specific feedback for incorrect answers
}
