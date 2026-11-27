import { useEffect, useRef, useState } from 'react';

/** 'up' or 'down' for a moment after a number changes, for pulse animations. */
export function useDelta(value: number): 'up' | 'down' | null {
  const prev = useRef(value);
  const [delta, setDelta] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (value === prev.current) return;
    setDelta(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setDelta(null), 650);
    return () => clearTimeout(t);
  }, [value]);
  return delta;
}
