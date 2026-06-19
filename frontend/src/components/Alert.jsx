export default function Alert({ variant = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${variant}`} role="alert">
      <span>{children}</span>
      {onClose && (
        <button className="alert__close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
