
import { GoogleGenAI, GenerateContentResponse, Chat, GroundingChunk } from "@google/genai";
import { DifficultyLevel, MultipleChoiceQuestion, ListeningTask, ReadingTask, PronunciationFeedback, ModuleType, UserAnswerData, IncorrectAnswerDetail } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" });
const modelName = 'gemini-2.5-flash-preview-04-17'; // General purpose model

const parseJsonFromText = <T,>(text: string, context: string = "Unknown context"): T | null => {
  console.log(`[GeminiService] Attempting to parse JSON for ${context}. Raw text received (first 500 chars):`, text.substring(0, 500));
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
    console.log(`[GeminiService] Extracted content from markdown fence for ${context} (first 500 chars):`, jsonStr.substring(0, 500));
  } else {
    console.log(`[GeminiService] No markdown fence found for ${context}. Proceeding with trimmed raw text.`);
  }

  if (!jsonStr) {
    console.error(`[GeminiService] JSON string is empty after trimming/fence removal for ${context}. Raw text was (first 500 chars):`, text.substring(0,500));
    return null;
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error(`[GeminiService] Failed to parse JSON directly for ${context}:`, e, ". Attempting loose match. Processed JSON string was (first 500 chars):", jsonStr.substring(0,500));
    const jsonLooseMatch = text.match(/\[.*\]|\{.*\}/s);
    if (jsonLooseMatch && jsonLooseMatch[0]) {
      try {
        console.log(`[GeminiService] Attempting to parse loose match for ${context} (first 500 chars):`, jsonLooseMatch[0].substring(0,500));
        return JSON.parse(jsonLooseMatch[0]) as T;
      } catch (e2) {
        console.error(`[GeminiService] Failed to parse JSON (loose match) for ${context}:`, e2, ". Original text was (first 500 chars):", text.substring(0,500));
      }
    }
    console.error(`[GeminiService] JSON parsing failed completely for ${context}. Returning null. Raw text was (first 500 chars):`, text.substring(0,500));
    return null;
  }
};


export const generateMcqQuestions = async (
  moduleType: ModuleType.GRAMMAR | ModuleType.VOCABULARY,
  difficulty: DifficultyLevel,
  count: number = 5,
  contextText?: string | null
): Promise<MultipleChoiceQuestion[]> => {
  const subject = moduleType === ModuleType.GRAMMAR ? "English grammar" : "English vocabulary (synonyms, antonyms, definitions, or context-based usage)";
  
  let promptContextBlock = "";
  if (contextText) {
    promptContextBlock = `
The following text is provided as context. Generate questions that are based on or directly related to this text, focusing on ${subject} as it appears or could be applied within this context.
---
CONTEXT START
${contextText}
CONTEXT END
---
`;
  }

  const prompt = `
    Generate ${count} *new and distinct* TOEFL ${subject} multiple-choice questions suitable for a ${difficulty} English proficiency level.
    ${promptContextBlock}
    If this request implies a progression in difficulty (e.g., from 'easy' to 'medium', or 'medium' to 'hard'), ensure these questions differ significantly in style, topic, or specific grammatical/lexical points tested compared to typical questions of a lower difficulty for this subject. Focus on fresh content and avoid repetition of question structures or specific examples if possible, especially if no context text is provided or if the context is broad.
    Each question should have a clear stem.
    Provide 4 distinct options (A, B, C, D) for each question. Only one option must be correct.
    Include a concise explanation for why the correct answer is right and, if possible, why common distractors are wrong.

    Return the response strictly as a JSON array of objects. Each object must have the following structure:
    {
      "questionText": "string (The main question text, e.g., 'She ___ to the store yesterday.' or 'Choose the best synonym for 'ubiquitous' *from the provided text* if context is given.')",
      "options": ["string (Option A)", "string (Option B)", "string (Option C)", "string (Option D)"],
      "correctAnswerIndex": "number (0 for A, 1 for B, 2 for C, 3 for D)",
      "explanation": "string (Detailed explanation for the correct answer and why others are incorrect)"
    }
    Ensure the JSON is well-formed and directly parsable. Do not include any introductory text or markdown formatting around the JSON array itself.
  `;
  const contextLog = `MCQ ${moduleType} ${difficulty} ${contextText ? `(contextual: "${contextText.substring(0,30)}...")` : '(general)'}`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsedData = parseJsonFromText<any[]>(response.text, contextLog);
    if (!parsedData || !Array.isArray(parsedData)) {
      console.error(`[GeminiService] Failed to parse questions or data is not an array for ${contextLog}. Raw response text (first 500 chars):`, response.text.substring(0,500));
      throw new Error(`Invalid format for MCQ questions from API for ${contextLog}.`);
    }
    return parsedData.map((q: any, index: number) => ({
      id: `${moduleType.toLowerCase()}-${difficulty}-${Date.now()}-${index}`,
      questionText: q.questionText || "Question text missing",
      options: q.options || ["Option A", "Option B", "Option C", "Option D"],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "No explanation provided.",
    }));
  } catch (error) {
    console.error(`[GeminiService] Error generating ${contextLog} questions:`, error);
    throw error;
  }
};


export const generateListeningTask = async (difficulty: DifficultyLevel, contextText?: string | null): Promise<ListeningTask> => {
  let scriptGenerationInstruction = `1. A short audio script (e.g., a conversation, a mini-lecture) of about 150-250 words. The script should be engaging and contain clear points for comprehension questions.`;
  if (contextText) {
    scriptGenerationInstruction = `
1. An audio script (e.g., a conversation, a mini-lecture) of about 150-250 words.
   *This script should be directly based on, or a natural continuation/discussion of, the following text context*:
   ---
   CONTEXT START
   ${contextText}
   CONTEXT END
   ---
   If the provided context is short and suitable (e.g. a dialogue snippet), it can be adapted or used as the script. Otherwise, create a new script that is thematically and substantively linked to it. The script must be suitable for the ${difficulty} English proficiency level.`;
  }

  const prompt = `
    Generate a *new and distinct* TOEFL-style listening task for a ${difficulty} English proficiency level.
    ${scriptGenerationInstruction}
    If this request implies a progression in difficulty and no specific context text is given, ensure the audio script content (e.g. complexity of language, speed of delivery, topic) and question types differ from typical tasks of a lower difficulty. Focus on fresh content.
    The task should include:
    2. Five multiple-choice comprehension questions based *only* on the generated script. Each question should have 4 options (A, B, C, D) and only one correct answer.
    3. A brief explanation for each question's correct answer.

    Return the response strictly as a single JSON object with the following structure:
    {
      "script": "string (The full text of the audio script)",
      "questions": [
        {
          "questionText": "string (Question about the script)",
          "options": ["string (Option A)", "string (Option B)", "string (Option C)", "string (Option D)"],
          "correctAnswerIndex": "number (0-3)",
          "explanation": "string (Explanation for the correct answer)"
        }
      ]
    }
    Ensure the JSON is well-formed and directly parsable. Do not include any introductory text or markdown formatting around the JSON object itself.
  `;
  const contextLog = `Listening Task ${difficulty} ${contextText ? `(contextual: "${contextText.substring(0,30)}...")` : '(general)'}`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsedData = parseJsonFromText<any>(response.text, contextLog);
     if (!parsedData || typeof parsedData.script !== 'string' || !Array.isArray(parsedData.questions)) {
      console.error(`[GeminiService] Failed to parse listening task or data is malformed for ${contextLog}. Raw response text (first 500 chars):`, response.text.substring(0,500));
      throw new Error(`Invalid format for listening task from API for ${contextLog}.`);
    }
    return {
      id: `listening-${difficulty}-${Date.now()}`,
      script: parsedData.script,
      questions: parsedData.questions.map((q: any, index: number) => ({
        id: `listening-q-${difficulty}-${Date.now()}-${index}`,
        questionText: q.questionText || "Question text missing",
        options: q.options || ["A", "B", "C", "D"],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        explanation: q.explanation || "No explanation.",
      })),
    };
  } catch (error) {
    console.error(`[GeminiService] Error generating ${contextLog}:`, error);
    throw error;
  }
};

export const generateReadingTask = async (difficulty: DifficultyLevel, contextText?: string | null): Promise<ReadingTask> => {
  let passageGenerationInstruction = `1. A reading passage of about 200-300 words on an academic or general interest topic.`;
  if (contextText) {
    passageGenerationInstruction = `
1. A reading passage. *Use the following text context as the primary basis for this passage*:
   ---
   CONTEXT START
   ${contextText}
   CONTEXT END
   ---
   If the provided text is of suitable length (around 200-300 words) and complexity for a ${difficulty} level reading task, you can use an excerpt of it or the full text if it fits. If it's too long, too short, or not entirely suitable as a standalone passage, generate a new passage of 200-300 words that is directly based on the themes, information, or style of the provided context text. The goal is to test comprehension related to this specific context. The passage must be suitable for the ${difficulty} English proficiency level.`;
  }
  
  const prompt = `
    Generate a *new and distinct* TOEFL-style reading comprehension task for a ${difficulty} English proficiency level.
    ${passageGenerationInstruction}
    If this request implies a progression in difficulty and no specific context text is given, ensure the reading passage (e.g. lexical density, sentence complexity, topic) and question types differ from typical tasks of a lower difficulty. Focus on fresh content.
    The task should include:
    2. Five multiple-choice comprehension questions based *only* on the passage (which is derived from the context text if provided). These questions should test various skills like finding main ideas, understanding details, making inferences, and vocabulary in context. Each question should have 4 options (A, B, C, D) and only one correct answer.
    3. A brief explanation for each question's correct answer.

    Return the response strictly as a single JSON object with the following structure:
    {
      "text": "string (The full reading passage)",
      "questions": [
        {
          "questionText": "string (Question about the passage)",
          "options": ["string (Option A)", "string (Option B)", "string (Option C)", "string (Option D)"],
          "correctAnswerIndex": "number (0-3)",
          "explanation": "string (Explanation for the correct answer)"
        }
      ]
    }
    Ensure the JSON is well-formed and directly parsable. Do not include any introductory text or markdown formatting around the JSON object itself.
  `;
  const contextLog = `Reading Task ${difficulty} ${contextText ? `(contextual: "${contextText.substring(0,30)}...")` : '(general)'}`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsedData = parseJsonFromText<any>(response.text, contextLog);
    if (!parsedData || typeof parsedData.text !== 'string' || !Array.isArray(parsedData.questions)) {
      console.error(`[GeminiService] Failed to parse reading task or data is malformed for ${contextLog}. Raw response text (first 500 chars):`, response.text.substring(0,500));
      throw new Error(`Invalid format for reading task from API for ${contextLog}.`);
    }
    return {
      id: `reading-${difficulty}-${Date.now()}`,
      text: parsedData.text,
      questions: parsedData.questions.map((q: any, index: number) => ({
        id: `reading-q-${difficulty}-${Date.now()}-${index}`,
        questionText: q.questionText || "Question text missing",
        options: q.options || ["A", "B", "C", "D"],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        explanation: q.explanation || "No explanation.",
      })),
    };
  } catch (error) {
    console.error(`[GeminiService] Error generating ${contextLog}:`, error);
    throw error;
  }
};


export const generatePronunciationPhrase = async (difficulty: DifficultyLevel): Promise<string> => {
  const prompt = `
    Generate a single, short English phrase (5-10 words) suitable for pronunciation practice at a ${difficulty} level.
    The phrase should contain common English sounds and intonation patterns. Avoid overly complex or rare vocabulary unless difficulty is 'hard'.
    Focus on providing varied phrases if multiple requests are made for the same difficulty level.
    Return ONLY the phrase as a plain text string. Do not include any extra text, labels, or quotation marks around the phrase itself.
    Example for medium: "The quick brown fox jumps over the lazy dog."
    Example for easy: "Hello, how are you today?"
  `;
  const context = `Pronunciation Phrase ${difficulty}`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    const phrase = response.text.trim().replace(/^["']|["']$/g, ''); 
    if (!phrase) {
        console.error(`[GeminiService] Generated pronunciation phrase is empty for ${context}. Raw response: `, response.text.substring(0,500));
        throw new Error(`Empty pronunciation phrase received for ${context}.`);
    }
    return phrase;
  } catch (error) {
    console.error(`[GeminiService] Error generating ${context}:`, error);
    throw error;
  }
};

export const analyzePronunciation = async (audioBase64: string, referencePhrase: string): Promise<PronunciationFeedback> => {
  const prompt = `
    The user was asked to say the following English phrase: "${referencePhrase}".
    Their recorded audio is provided.
    Analyze their pronunciation focusing on:
    1. Clarity and accuracy of individual sounds (phonemes) compared to standard English.
    2. Correctness of word stress and emphasis.
    3. Naturalness of sentence intonation and rhythm.
    4. Overall fluency and intelligibility.

    Provide a score from 0 to 100, where 100 represents native-like, clear pronunciation and 0 is completely unintelligible or unrelated to the phrase.
    Also, provide concise, constructive textual feedback. Highlight specific areas for improvement (e.g., "The 'th' sound in 'the' was unclear", "Intonation should rise at the end of the question"). Also mention what was done well if applicable.

    Return the response strictly as a JSON object with the following structure:
    {
      "score": "number (0-100)",
      "feedbackText": "string (Detailed feedback)"
    }
    Ensure the JSON is well-formed and directly parsable. Do not include any introductory text or markdown formatting around the JSON object itself.
  `;
  
  const audioPart = {
    inlineData: {
      mimeType: 'audio/webm', 
      data: audioBase64,
    },
  };

  const textPart = { text: prompt };
  const context = `Pronunciation Analysis for phrase: "${referencePhrase.substring(0,50)}"`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName, 
        contents: { parts: [textPart, audioPart] },
        config: { responseMimeType: "application/json" }
    });

    const parsedData = parseJsonFromText<PronunciationFeedback>(response.text, context);

    if (!parsedData || typeof parsedData.score !== 'number' || typeof parsedData.feedbackText !== 'string') {
        console.error(`[GeminiService] Failed to parse pronunciation feedback or data is malformed for ${context}. Raw response text (first 500 chars):`, response.text.substring(0,500));
        return {
            score: 0,
            feedbackText: `Could not fully parse the AI's response. Please check console for details. Raw response (preview): ${response.text.substring(0, 200)}...`
        };
    }
    return parsedData;

  } catch (error) {
    console.error(`[GeminiService] Error analyzing pronunciation for ${context}:`, error);
    return {
        score: 0,
        feedbackText: "An error occurred while analyzing pronunciation. Please try again and check console for details."
    };
  }
};

export const generateLearningSuggestion = async (
  moduleType: ModuleType,
  score: number,
  totalItems: number,
  difficulty: DifficultyLevel
): Promise<string> => {
  let performanceDescription = "";
  if (moduleType === ModuleType.PRONUNCIATION) {
    performanceDescription = `an average score of ${score}/100 over ${totalItems} phrases`;
  } else {
    performanceDescription = `a score of ${score}/${totalItems} correct items`;
  }

  const prompt = `
    A user has completed a TOEFL ${moduleType} practice module at ${difficulty} difficulty level, achieving ${performanceDescription}.
    Provide a concise (1-2 sentences) and actionable overall learning suggestion to help them improve or maintain their level.
    Focus on general strategies or areas of focus suitable for this performance.
    If the score is high (e.g., >80% for MCQ/Reading/Listening, >80/100 for Pronunciation), offer encouragement and suggest exploring more advanced topics, maintaining consistency, or focusing on nuanced aspects.
    If the score is mid-range, suggest general areas or strategies for improvement.
    If the score is low, suggest foundational work or general resources if appropriate, in a supportive tone.
    Return ONLY the suggestion as a plain text string. Do not include any extra text or labels.
  `;
  const context = `Learning Suggestion for ${moduleType}, score ${score}/${totalItems}, difficulty ${difficulty}`;
  try {
    if (!API_KEY) { 
      console.warn("[GeminiService] API_KEY not available for generateLearningSuggestion.");
      return "API Key not configured. Cannot generate suggestions.";
    }
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    const suggestion = response.text.trim();
     if (!suggestion) {
        console.error(`[GeminiService] Generated learning suggestion is empty for ${context}. Raw response: `, response.text.substring(0,500));
        return "Could not generate an overall suggestion at this time.";
    }
    return suggestion;
  } catch (error) {
    console.error(`[GeminiService] Error generating ${context}:`, error);
    return "An error occurred while generating an overall learning suggestion.";
  }
};

export const generateSpecificFeedbackForIncorrectAnswers = async (
  incorrectAnswers: UserAnswerData[]
): Promise<{ questionId: string; tip: string }[]> => {
  if (!incorrectAnswers || incorrectAnswers.length === 0) {
    return [];
  }

  const questionsDetails = incorrectAnswers.map((item, index) => 
    `Incorrect Answer ${index + 1}:
    Question ID: "${item.questionId}"
    Question Text: "${item.questionText}"
    User's Answer: "${item.userAnswer}"
    Correct Answer: "${item.correctAnswer}"
    Provided Explanation: "${item.explanation}"`
  ).join("\n\n");

  const prompt = `
    A user made the following mistakes on a TOEFL practice module. For each incorrect answer provided below, generate a concise (1-2 sentences) and actionable tip. This tip should go beyond the 'Provided Explanation' and offer a new perspective, point out a common pitfall related to the user's error, or suggest a specific concept to review. The goal is to help the user understand *why* they made the mistake and how to avoid similar errors.

    ${questionsDetails}

    Return the response strictly as a JSON array of objects. Each object must have the following structure:
    {
      "questionId": "string (The Question ID exactly as provided above for mapping)",
      "tip": "string (Your concise, actionable tip for this specific incorrect answer)"
    }
    Ensure the JSON is well-formed and directly parsable. Do not include any introductory text or markdown formatting around the JSON array itself. If a tip cannot be generated for a specific question for some reason, you can omit it from the array or return an empty tip string for that questionId.
  `;

  const context = `Specific Feedback for ${incorrectAnswers.length} incorrect answers`;
  try {
    if (!API_KEY) {
      console.warn("[GeminiService] API_KEY not available for generateSpecificFeedbackForIncorrectAnswers.");
      return incorrectAnswers.map(q => ({ questionId: q.questionId, tip: "API Key not configured. Cannot generate specific tip." }));
    }
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    
    const parsedData = parseJsonFromText<{ questionId: string; tip: string }[]>(response.text, context);

    if (!parsedData || !Array.isArray(parsedData)) {
      console.error(`[GeminiService] Failed to parse specific feedback or data is not an array for ${context}. Raw response text (first 500 chars):`, response.text.substring(0,500));
      return incorrectAnswers.map(q => ({ questionId: q.questionId, tip: "Could not parse AI tip for this question." }));
    }
    
    const tipsMap = new Map(parsedData.map(item => [item.questionId, item.tip]));
    return incorrectAnswers.map(q => ({
        questionId: q.questionId,
        tip: tipsMap.get(q.questionId) || "No specific tip generated by AI for this question."
    }));

  } catch (error) {
    console.error(`[GeminiService] Error generating ${context}:`, error);
    return incorrectAnswers.map(q => ({ questionId: q.questionId, tip: "Error generating AI tip for this question." }));
  }
};
