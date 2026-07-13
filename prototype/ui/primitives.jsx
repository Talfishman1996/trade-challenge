import { forwardRef, useEffect, useRef } from 'react';
import { AlertTriangle, Check, Clock3, CloudOff, LoaderCircle, XCircle } from 'lucide-react';

export const Button = forwardRef(function Button({ variant = 'primary', className = '', children, ...props }, ref) {
  return <button ref={ref} className={`button button--${variant} ${className}`} {...props}>{children}</button>;
});

export const IconButton = forwardRef(function IconButton({ label, children, className = '', ...props }, ref) {
  return <button ref={ref} className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
});

export function useDialogFocus({ active, initialFocusRef, onEscape }) {
  const dialogRef = useRef(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    requestAnimationFrame(() => (initialFocusRef?.current || dialog?.querySelector(focusableSelector))?.focus());

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)].filter((element) => !element.hidden && element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => previousFocus?.focus?.());
    };
  }, [active, initialFocusRef]);

  return dialogRef;
}

export function Card({ as: Element = 'section', className = '', children, ...props }) {
  return <Element className={`card ${className}`} {...props}>{children}</Element>;
}

export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}

export function StatusPill({ state, children }) {
  const icons = {
    verified: <Check aria-hidden="true" />,
    queued: <Clock3 aria-hidden="true" />,
    checking: <LoaderCircle className="spin" aria-hidden="true" />,
    offline: <CloudOff aria-hidden="true" />,
    failed: <XCircle aria-hidden="true" />,
    conflict: <AlertTriangle aria-hidden="true" />,
  };
  return <span className={`status-pill status-pill--${state}`}>{icons[state]}<span>{children}</span></span>;
}

export function Field({ label, error, hint, id, children }) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="field__hint" id={descriptionId}>{hint}</p>}
      {error && <p className="field__error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, detail, action }) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{detail}</p>{action}</div>;
}

export function SectionHeading({ eyebrow, title, action, level = 1 }) {
  const Heading = level === 2 ? 'h2' : 'h1';
  return <div className="section-heading"><div>{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<Heading>{title}</Heading></div>{action}</div>;
}

export function Segmented({ label, value, options, onChange }) {
  return (
    <fieldset className="segmented">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          type="button"
          className={value === option.value ? 'is-selected' : ''}
          aria-pressed={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export function formatRelativeTime(value) {
  if (!value) return 'Never';
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
