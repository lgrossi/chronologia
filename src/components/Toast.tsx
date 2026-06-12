/**
 * Toast — confirmation pill anchored above the tab bar. Dark ink surface,
 * on-accent text, a light-green check icon, auto-dismiss at 2200ms.
 *
 * Usage: render <ToastHost /> once near the screen root, then call show() from
 * the useToast() hook anywhere below the provider:
 *
 *   <ToastProvider>
 *     <App />        // any descendant can call useToast().show('guardado')
 *     <ToastHost />
 *   </ToastProvider>
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { COLORS } from '@/theme/tokens';
import { Icon } from '@/components/Icon';

/** Spec: auto-dismiss after 2200ms. */
export const TOAST_DURATION_MS = 2200;
/** Light-green check, matching the prototype. */
const CHECK_COLOR = '#9BD3A0';
const SHADOW_TOAST = '0 12px 28px -10px rgba(0,0,0,0.5)';

interface ToastContextValue {
  /** Current message, or null when hidden. */
  msg: string | null;
  /** Show a toast; auto-dismisses after TOAST_DURATION_MS. */
  show: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(next);
    timer.current = setTimeout(() => setMsg(null), TOAST_DURATION_MS);
  }, []);

  return <ToastContext.Provider value={{ msg, show }}>{children}</ToastContext.Provider>;
}

/** Access show() from any descendant of ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/** Renders the current toast (if any). Place once inside ToastProvider. */
export function ToastHost() {
  const { msg } = useToast();
  if (!msg) return null;
  return <Toast msg={msg} />;
}

/** Presentational toast — render directly when you manage visibility yourself. */
export function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 104,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        background: COLORS.ink,
        color: COLORS.onAccent,
        padding: '12px 20px',
        borderRadius: 14,
        fontSize: 14.5,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        boxShadow: SHADOW_TOAST,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name="check" size={17} color={CHECK_COLOR} strokeWidth={3} /> {msg}
    </div>
  );
}
