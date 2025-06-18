import React from 'react';

export const MicrophoneIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className}`}>
    <path d="M12 18.75a6 6 0 0 0 6-6V6a6 6 0 0 0-12 0v6.75a6 6 0 0 0 6 6Z" />
    <path d="M12 22.5a3 3 0 0 1-3-3v-1.125a9.018 9.018 0 0 1 6 0V19.5a3 3 0 0 1-3 3Z" />
    <path d="M12 15a2.25 2.25 0 0 1-2.25-2.25V6.365c0-.98.741-1.801 1.688-1.956A2.253 2.253 0 0 1 12.75 4.5V12a2.25 2.25 0 0 1-.75 1.604v.001A2.248 2.248 0 0 1 12 15Z" />
    <path d="M17.25 12.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5Z" />
    <path d="M12 5.25a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" />
    <path d="M8.25 12.75a.75.75 0 0 0 0-1.5H6.75a.75.75 0 0 0 0 1.5h1.5Z" />
  </svg>
);

export const SpeakerWaveIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className}`}>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06Z" />
    <path d="M18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 4.5 4.5 0 0 1 0 6.364.75.75 0 0 1-1.06-1.06 3 3 0 0 0 0-4.243.75.75 0 0 1 0-1.06Z" />
  </svg>
);

export const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className}`}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.06-1.06l-3.093 3.093-1.407-1.407a.75.75 0 0 0-1.06 1.06L11.94 13.815l3.62-3.62Z" clipRule="evenodd" />
  </svg>
);

export const XCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className}`}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
  </svg>
);

export const ArrowPathIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M15.312 11.437a.75.75 0 0 1-.027 1.06l-5.25 5.25a.75.75 0 0 1-1.06-1.06L13.939 12l-4.936-4.937a.75.75 0 0 1 1.06-1.06l5.25 5.25a.75.75 0 0 1 .027 1.06Z" clipRule="evenodd" />
     <path fillRule="evenodd" d="M7.812 11.437a.75.75 0 0 1-.027 1.06l-5.25 5.25A.75.75 0 0 1 .285 16.687L5.439 12L.285 7.063a.75.75 0 1 1 1.06-1.06l5.25 5.25a.75.75 0 0 1 .027 1.06Z" clipRule="evenodd" />
  </svg>
);


export const LightBulbIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a7.5 7.5 0 0 1-3 0m3-12.451c.391-.078.79-.153 1.193-.219M5.106 18.255c1.28.139 2.57.248 3.87.35M7.5 12C4.56 12 2.25 9.75 2.25 6.75S4.56 1.5 7.5 1.5s5.25 2.25 5.25 6.75m-7.5 3.75h7.5m-7.5 3.75h7.5M12 1.5s.472.06.954.172M16.5 1.5c.982.68 1.874 1.527 2.625 2.527m-9.75 0A48.967 48.967 0 0 1 12 5.25c.391-.078.79-.153 1.193-.219m-2.386 3.003c.035.023.07.044.105.065m-2.12 8.683c.405-.006.81-.006 1.215 0c.151.002.302.002.453 0M12 18.75v-5.25m0 0c.621.041 1.233.069 1.845.083m-1.845-.083a12.06 12.06 0 0 1-1.845.083" />
</svg>
);

export const SaveIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path d="M3 3h14l-4-4H3a2 2 0 00-2 2v14a2 2 0 002 2h10v-4H5V5h12v3l2-2V3a2 2 0 00-2-2zM8 17a1 1 0 01-1-1V9a1 1 0 011-1h8a1 1 0 011 1v7a1 1 0 01-1 1H8zm1-6h6v-1H9v1zm0 3h6v-1H9v1z" />
    <path fillRule="evenodd" d="M3 17.75A2.25 2.25 0 005.25 20H18.75a2.25 2.25 0 002.25-2.25V10.5h.75a.75.75 0 000-1.5H21V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75v11zM5.25 6a.75.75 0 01.75-.75h12a.75.75 0 01.75.75v3.75h-3a.75.75 0 00-.75.75v6H6a.75.75 0 01-.75-.75V6zm12.75 3.75V6h-12v3.75h12zM12 18.75a.75.75 0 00.75-.75v-4.5a.75.75 0 00-1.5 0v4.5a.75.75 0 00.75.75z" clipRule="evenodd" />
  </svg>
);

export const DocumentTextIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);