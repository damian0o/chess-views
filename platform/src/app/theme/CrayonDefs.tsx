/**
 * The SVG filters the Kredki look draws with: `cv-rough` makes an outline wobble like a hand-drawn line,
 * `cv-stroke` makes a line look drawn with a wax crayon (gaps in the wax, a slight wobble).
 * Mounted once by ThemeRoot, only while the Kredki look is on.
 */
export function CrayonDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="cv-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <filter id="cv-stroke" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2 0.3" numOctaves="2" seed="5" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.8 1.5" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" result="g" />
          <feTurbulence type="fractalNoise" baseFrequency="0.04" seed="2" result="t" />
          <feDisplacementMap in="g" in2="t" scale="3" />
        </filter>
      </defs>
    </svg>
  );
}
