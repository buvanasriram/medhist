import React from 'react';

export const BuildingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="4" y="4" width="16" height="18" rx="2" ry="2" />
    <path d="M8 8h.01" />
    <path d="M8 12h.01" />
    <path d="M8 16h.01" />
    <path d="M12 8h.01" />
    <path d="M12 12h.01" />
    <path d="M12 16h.01" />
    <path d="M16 8h.01" />
    <path d="M16 12h.01" />
    <path d="M16 16h.01" />
  </svg>
);
