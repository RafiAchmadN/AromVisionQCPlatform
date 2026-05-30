'use client';
import { useState, useEffect } from 'react';

export function NotifBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {}
    }
    fetchCount();
    const id = setInterval(fetchCount, 8_000);
    return () => clearInterval(id);
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none shrink-0">
      {count > 9 ? '9+' : count}
    </span>
  );
}
