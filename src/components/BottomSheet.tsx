/**
 * BottomSheet — scrim + bottom-anchored panel (the day-detail / add-event
 * surface). Tap the scrim to close. The panel slides up on mount; it ships its
 * own @keyframes so it works without touching global CSS.
 */
import type { ReactNode } from 'react';
import { COLORS } from '@/theme/tokens';

const SHADOW_SHEET = '0 -16px 40px -12px rgba(0,0,0,0.4)';
const SCRIM = 'rgba(40,32,22,0.4)';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <style>{'@keyframes chrono-sheet-up{from{transform:translateY(100%)}to{transform:none}}'}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: SCRIM }} />
      <div
        style={{
          position: 'relative',
          background: COLORS.paper,
          borderRadius: '26px 26px 0 0',
          padding: '12px 22px 40px',
          maxHeight: '78%',
          overflowY: 'auto',
          boxShadow: SHADOW_SHEET,
          animation: 'chrono-sheet-up .25s',
        }}
      >
        <div
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            background: COLORS.line,
            margin: '0 auto 18px',
          }}
        />
        {children}
      </div>
    </div>
  );
}
