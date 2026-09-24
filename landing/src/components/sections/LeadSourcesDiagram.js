"use client";

import React from "react";

// Hub-and-spoke diagram: 5 lead sources converging into EzzySync

const CX = 280;
const CY = 255; // centre of EzzySync node

const sources = [
  { id: "wa",     label: "WhatsApp",             color: "#22c55e", x: 52,  y: 30  },
  { id: "meta",   label: "Facebook & Instagram",  color: "#3b82f6", x: 156, y: 0   },
  { id: "google", label: "Google Ads",            color: "#f59e0b", x: 280, y: 0   },
  { id: "web",    label: "Website Forms",         color: "#6366f1", x: 404, y: 0   },
  { id: "excel",  label: "Excel / CSV Import",    color: "#16a34a", x: 508, y: 30  },
];

export default function LeadSourcesDiagram() {
  return (
    <div className="w-full">
      {/* ── Desktop: hub-and-spoke SVG ── */}
      <div className="hidden sm:block w-full" aria-hidden="true">
        {/* Inline keyframes — scoped to this component */}
        <style>{`
          @keyframes ezzy-dot {
            0%   { opacity: 0; offset-distance: 0%;   }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { opacity: 0; offset-distance: 100%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .ezzy-lead-dot { display: none; }
          }
        `}</style>

        <svg
          viewBox="0 0 560 320"
          width="100%"
          role="img"
          aria-label="Lead sources flowing into EzzySync automatically"
        >
          <title>
            Leads from WhatsApp, Facebook &amp; Instagram, Google Ads, Website
            Forms, and Excel all flow automatically into EzzySync
          </title>

          {sources.map((s, i) => {
            const nodeX = s.x + 22;
            const nodeY = s.y + 22;
            const pathD = `M${nodeX},${nodeY} Q${(nodeX + CX) / 2},${nodeY} ${CX},${CY}`;
            const pathId = `ezzy-path-${s.id}`;
            return (
              <g key={s.id}>
                {/* Spoke curve (visible track) */}
                <path
                  id={pathId}
                  d={pathD}
                  stroke="#334155"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 4"
                />
                {/* Animated dot travelling the spoke */}
                <circle
                  className="ezzy-lead-dot"
                  r="5"
                  fill={s.color}
                  style={{
                    offsetPath: `path('${pathD}')`,
                    offsetDistance: "0%",
                    animation: `ezzy-dot 2.4s ${i * 0.48}s ease-in-out infinite`,
                  }}
                />
                {/* Source node */}
                <circle
                  cx={nodeX}
                  cy={nodeY}
                  r="24"
                  fill="white"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
                <circle cx={nodeX} cy={nodeY} r="8" fill={s.color} />
                {/* Source label */}
                <text
                  x={nodeX}
                  y={nodeY + 42}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                  fontFamily="inherit"
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* Centre EzzySync hub */}
          <circle cx={CX} cy={CY} r="40" fill="#ea580c" />
          <circle cx={CX} cy={CY} r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="700"
            fontFamily="inherit"
          >
            EzzySync
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.75)"
            fontFamily="inherit"
          >
            All leads here
          </text>
        </svg>
      </div>

      {/* ── Mobile: accessible vertical list ── */}
      <ul className="sm:hidden space-y-2.5 text-sm text-slate-700">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            <span>{s.label}</span>
            <span className="text-slate-400 ml-auto text-xs">→ EzzySync</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
