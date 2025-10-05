"use client";
import { useEffect, useState } from "react";

export function useSummary(address: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const core = await fetch(`/api/summary?address=${address}`).then(r => r.json());
        if (dead) return;
        setData(core);

        // حمّل التفاصيل الثقيلة وادمجها
        fetch(`/api/summary/details?address=${address}`)
          .then(r => r.json())
          .then((details) => {
            if (dead) return;
            setData((prev: any) => ({ ...(prev || {}), ...(details || {}), partial: false }));
          })
          .catch(() => {/* ignore */});
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [address]);

  return { data, loading };
}
