/** Static fallback for the hero scene (mobile, reduced motion, before JS loads). */
export function StaticPlate({ className }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="A plate with gold accents">
      <defs>
        <radialGradient id="plateGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#B9975B" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#B9975B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="plateFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5F0E6" />
          <stop offset="100%" stopColor="#D8C8AC" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#plateGlow)" />
      <ellipse cx="200" cy="238" rx="158" ry="50" fill="#000" opacity="0.35" />
      <ellipse cx="200" cy="220" rx="150" ry="52" fill="url(#plateFace)" />
      <ellipse cx="200" cy="216" rx="112" ry="36" fill="#292D29" />
      <ellipse cx="200" cy="216" rx="130" ry="44" fill="none" stroke="#B9975B" strokeWidth="1.5" />
      <ellipse cx="205" cy="190" rx="44" ry="30" fill="#B9975B" />
      <circle cx="145" cy="198" r="16" fill="#66745A" />
      <circle cx="262" cy="196" r="13" fill="#66745A" />
      <ellipse cx="240" cy="176" rx="20" ry="13" fill="#D8C8AC" />
      <circle cx="120" cy="120" r="6" fill="#B9975B" />
      <circle cx="290" cy="110" r="4" fill="#B9975B" />
      <circle cx="210" cy="82" r="5" fill="#B9975B" />
    </svg>
  );
}
