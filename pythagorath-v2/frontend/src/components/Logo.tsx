import { useState } from 'react';

/**
 * Official Pythagorath logo.
 *   variant="orange" -> for light backgrounds  (/500_برتقالي.png)
 *   variant="white"  -> for coloured/dark backgrounds (/500_ابيض.png)
 *
 * The PNGs live in /public. Until they are present, a branded Tajawal wordmark
 * is shown as a graceful fallback (auto-upgrades to the image once added).
 */
export function Logo({
  variant = 'orange',
  className = '',
}: {
  variant?: 'orange' | 'white';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = variant === 'white' ? '/500_ابيض.png' : '/500_برتقالي.png';

  if (failed) {
    const color = variant === 'white' ? 'text-white' : 'text-primary';
    return (
      <span className={`font-extrabold tracking-tight ${color} ${className}`}>
        فيثاغورث
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="فيثاغورث"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
