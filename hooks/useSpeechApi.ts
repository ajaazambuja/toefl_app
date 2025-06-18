import { useState, useEffect, useCallback } from 'react';

// TYPE DEFINITIONS FOR WEB SPEECH API
// These interfaces provide type safety for the Web Speech API, which is not fully standardized in TypeScript's default DOM typings.

interface SpeechRecognitionAlternativeType {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultType {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeType;
  readonly [index: number]: SpeechRecognitionAlternativeType;
}

interface SpeechRecognitionResultListType {
  readonly length: number;
  item(index: number): SpeechRecognitionResultType;
  readonly [index: number]: SpeechRecognitionResultType;
}

interface SpeechRecognitionEventType extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListType;
  // readonly interpretation?: any; // For EMMA (Extensible MultiModal Annotation markup language)
  // readonly emma?: Document | null; // For EMMA
}

interface SpeechRecognitionErrorEventType extends Event { // Based on MDN, SpeechRecognitionErrorEvent inherits from Event.
  readonly error: string; // Describes the error (e.g., 'no-speech', 'network')
  readonly message: string; // Contains a message describing the error in more detail.
}

// Interface for the SpeechRecognition constructor
interface SpeechRecognitionStaticType {
  new(): SpeechRecognitionInstanceType;
}

// Interface for an instance of SpeechRecognition
interface SpeechRecognitionInstanceType extends EventTarget {
  grammars: any; // Type is SpeechGrammarList, simplified here
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  // serviceURI: string; // Deprecated

  onaudiostart: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognitionInstanceType, ev: SpeechRecognitionEventType) => any) | null;
  onnomatch: ((this: SpeechRecognitionInstanceType, ev: SpeechRecognitionEventType) | null);
  onerror: ((this: SpeechRecognitionInstanceType, ev: SpeechRecognitionErrorEventType) => any) | null;
  onstart: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInstanceType, ev: Event) => any) | null;

  abort(): void;
  start(): void;
  stop(): void;
}

// Augment the global Window interface to include SpeechRecognition and webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStaticType;
    webkitSpeechRecognition?: SpeechRecognitionStaticType;
  }
}
// END TYPE DEFINITIONS

// Speech Synthesis
interface UseSpeechSynthesisReturn {
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  supported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!supported || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false); // Reset on error too
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);


  return { speak, cancel, isSpeaking, supported };
}

// Speech Recognition
interface UseSpeechRecognitionReturn {
  startListening: (lang?: string) => void;
  stopListening: () => void;
  transcript: string;
  isListening: boolean;
  error: string | null;
  supported: boolean;
  interimTranscript: string;
  resetTranscript: () => void;
}

// Get the SpeechRecognition constructor from the window object
const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<SpeechRecognitionInstanceType | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (SpeechRecognitionAPI) {
      setSupported(true);
      const instance = new SpeechRecognitionAPI();
      instance.continuous = true;
      instance.interimResults = true;
      
      instance.onresult = (event: SpeechRecognitionEventType) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript(currentInterim);
      };

      instance.onend = () => {
        setIsListening(false);
        setInterimTranscript(''); 
      };
      instance.onerror = (event: SpeechRecognitionErrorEventType) => {
        setError(event.error + (event.message ? `: ${event.message}`: ''));
        setIsListening(false);
      };
      setRecognitionInstance(instance);
    }
  }, []);

  const startListening = useCallback((lang: string = 'en-US') => {
    if (recognitionInstance && !isListening) {
      setTranscript(''); 
      setInterimTranscript('');
      setError(null);
      recognitionInstance.lang = lang;
      try {
        recognitionInstance.start();
        setIsListening(true);
      } catch (e) {
        if (e instanceof Error && e.name === 'InvalidStateError') {
          // recognitionInstance.stop(); // This would trigger onend.
          // Await stop or handle state more carefully
           setError('Recognition service busy. Please try again shortly.');
        } else if (e instanceof Error) {
            setError(`Failed to start recognition: ${e.message}`);
        } else {
            setError('Failed to start recognition.');
        }
      }
    }
  }, [recognitionInstance, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionInstance && isListening) {
      recognitionInstance.stop();
      // isListening will be set to false by the onend handler
    }
  }, [recognitionInstance, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return { startListening, stopListening, transcript, interimTranscript, isListening, error, supported, resetTranscript };
}