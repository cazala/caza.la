import { useCallback } from 'react';

export function useHueTextColor(selector: string = '.text') {
  return useCallback(
    (value: number) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      el.style.color = `hsl(${value * 360}deg, 100%, 50%)`;
    },
    [selector]
  );
}
