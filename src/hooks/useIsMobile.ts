import { useMemo } from 'react';

export function useIsMobile() {
  return useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);
}
