import { X } from 'lucide-react';

/**
 * Card in a Mexican editorial style, featuring a warm-toned paper background, an inked edge, and an engraved-style shadow.
 */
export function RetroCard({ children, className = '', variant = 'default' }) {
  const variants = {
    default: 'bg-crema-paper border-2 border-tinta shadow-vintage-sm',
    highlighted: 'bg-maiz-soft border-2 border-tinta shadow-vintage',
    nopal: 'bg-nopal text-crema border-2 border-tinta shadow-vintage',
    dashed: 'bg-crema-paper/60 border-2 border-dashed border-tinta-soft',
  };

  return (
    <div className={`rounded-xl p-5 ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Button with mechanical tactile feedback (it moves when pressed, like a rubber stamp).
 */
export function RetroButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  title,
}) {
  const variants = {
    primary: 'bg-nopal hover:bg-nopal-dark text-crema border-2 border-tinta shadow-vintage-sm',
    accent: 'bg-cempasuchil hover:bg-cempasuchil-dark text-crema border-2 border-tinta shadow-vintage-sm',
    secondary: 'bg-crema-paper hover:bg-maiz-soft text-tinta border-2 border-tinta shadow-vintage-sm',
    oliva: 'bg-oliva hover:bg-oliva-light text-crema border-2 border-tinta shadow-vintage-sm',
    ghost: 'bg-transparent hover:bg-tinta/10 text-tinta border border-transparent',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none ${
        variants[variant] || variants.primary
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Badge inspired by a postage stamp / vintage label.
 */
export function RetroBadge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-crema-sunken text-tinta border border-tinta/40',
    nopal: 'bg-nopal/15 text-nopal-dark border border-nopal/40',
    cempasuchil: 'bg-cempasuchil/15 text-cempasuchil-dark border border-cempasuchil/40',
    maiz: 'bg-maiz text-tinta border border-tinta/50',
    oliva: 'bg-oliva/15 text-oliva border border-oliva/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Ornamental divider featuring traditional geometric diamond patterns.
 */
export function OrnamentalDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 border-t-2 border-double border-tinta/30" />
      <span className="text-xs font-semibold uppercase tracking-widest text-tinta-muted flex items-center gap-1.5">
        <span className="text-cempasuchil">◆</span>
        {label}
        <span className="text-nopal">◆</span>
      </span>
      <div className="flex-1 border-t-2 border-double border-tinta/30" />
    </div>
  );
}

/**
 * Accessible and clean modal, framed with an editorial aesthetic.
 */
export function RetroModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-tinta/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-crema-paper border-2 border-tinta rounded-2xl max-w-md w-full p-6 shadow-vintage-lg space-y-4">
        <div className="flex items-center justify-between border-b-2 border-tinta/15 pb-3">
          <h3 className="text-xl font-bold font-display text-tinta flex items-center gap-2">
            <span className="text-cempasuchil text-sm">◆</span> {title}
          </h3>
          <button
            onClick={onClose}
            className="text-tinta-muted hover:text-cempasuchil p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}