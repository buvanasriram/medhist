
import React from 'react';

export const StethoscopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 18a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V9a2 2 0 0 0-2-2h-2" />
    <path d="M6 18V4a2 2 0 0 1 2-2h2" />
    <path d="M8 4h2a2 2 0 0 1 2 2v2" />
    <path d="M18 10a4 4 0 1 0-8 0" />
  </svg>
);
