// IMPORTANT: manualMinutes and ezzysyncMinutes must come from real customer
// measurements — never hardcode values in this component. Pass only verified data.

/**
 * Pure-SVG horizontal bar chart comparing quote time.
 * Renders nothing if either prop is missing.
 *
 * Props:
 *   manualMinutes   — time with manual process (number | null)
 *   ezzysyncMinutes — time with EzzySync (number | null)
 *   label           — chart title (string, optional)
 */
export default function TimeComparisonChart({
  manualMinutes,
  ezzysyncMinutes,
  label = "Time to send a quote",
}) {
  if (manualMinutes == null || ezzysyncMinutes == null) return null;

  const MAX_W = 220;
  const max = Math.max(manualMinutes, ezzysyncMinutes);
  const manualW = Math.round((manualMinutes / max) * MAX_W);
  const ezzyW   = Math.round((ezzysyncMinutes / max) * MAX_W);

  return (
    <figure aria-label={label} className="w-full max-w-xs">
      <figcaption className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {label}
      </figcaption>
      <svg
        viewBox="0 0 300 110"
        width="100%"
        role="img"
        aria-label={`${label}: Manual ${manualMinutes} minutes vs EzzySync ${ezzysyncMinutes} minutes`}
      >
        <title>
          {label}: Manual (Word/Canva) {manualMinutes} min vs EzzySync{" "}
          {ezzysyncMinutes} min
        </title>

        {/* Manual bar */}
        <text x="0" y="20" fontSize="11" fill="#475569" fontFamily="inherit">
          Manual (Word/Canva)
        </text>
        <rect x="0" y="26" width={manualW} height="20" rx="4" fill="#f43f5e" />
        <text
          x={manualW + 6}
          y="40"
          fontSize="11"
          fill="#0f172a"
          fontWeight="600"
          fontFamily="inherit"
        >
          {manualMinutes} min
        </text>

        {/* EzzySync bar */}
        <text x="0" y="72" fontSize="11" fill="#475569" fontFamily="inherit">
          EzzySync
        </text>
        <rect x="0" y="78" width={ezzyW} height="20" rx="4" fill="#ea580c" />
        <text
          x={ezzyW + 6}
          y="92"
          fontSize="11"
          fill="#0f172a"
          fontWeight="600"
          fontFamily="inherit"
        >
          {ezzysyncMinutes} min
        </text>
      </svg>
    </figure>
  );
}
