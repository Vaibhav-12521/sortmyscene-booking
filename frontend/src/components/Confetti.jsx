import { useMemo } from 'react';

const COLORS = ['#0f766e', '#c98a16', '#2f7d52', '#18120e', '#cfc8ba'];

/** Lightweight CSS confetti burst. Generates pieces once on mount. */
export default function Confetti({ count = 44 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        bg: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        radius: Math.random() > 0.5 ? '50%' : '2px',
      })),
    [count]
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.bg,
            borderRadius: p.radius,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
