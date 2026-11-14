import { useEffect, useRef } from 'react';

// Overlays currently open, oldest first. Escape closes only the top-most one, so pressing it in
// a confirm dialog opened from a modal doesn't close both.
const openOverlays: symbol[] = [];

export function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol('overlay');
    openOverlays.push(id);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || openOverlays[openOverlays.length - 1] !== id) return;
      event.stopPropagation();
      onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = openOverlays.indexOf(id);
      if (index >= 0) openOverlays.splice(index, 1);
    };
  }, [isOpen]);
}
