import React from 'react';
import { P } from './Constants';

export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="white" stroke="#7c3aed" strokeWidth="4"/>
      <text x="50" y="37" textAnchor="middle" fontSize="17" fontWeight="600" fill="#6d28d9">Somos</text>
      <text x="50" y="68" textAnchor="middle" fontSize="33" fontWeight="900" fill="#6d28d9">PRO</text>
    </svg>
  );
}

export const Card = ({ children, style = {} }) => (
  <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", ...style }}>
    {children}
  </div>
);

export const Badge = ({ children, color = "#666", bg = "#eee" }) => (
  <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", color, background: bg }}>
    {children}
  </span>
);
