import { useCountdown } from '../hooks/useCountdown.js';

export default function CountdownTimer({ expiresAt, onExpire }) {
  const { mmss, remainingMs } = useCountdown(expiresAt, onExpire);
  const urgent = remainingMs > 0 && remainingMs < 60 * 1000;

  return (
    <div className={`countdown ${urgent ? 'countdown--urgent' : ''}`}>
      <span className="countdown__label">Hold expires in</span>
      <span className="countdown__clock">{mmss}</span>
    </div>
  );
}
