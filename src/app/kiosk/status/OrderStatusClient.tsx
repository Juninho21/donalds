"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId: number;
  initial: { status: string; total: number; consumptionMethod: string };
};

export default function OrderStatusClient({ orderId, initial }: Props) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Falha ao buscar status");
        const json = await res.json();
        setData({ status: json.status, total: json.total, consumptionMethod: json.consumptionMethod });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível atualizar o status.");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm">Status</p>
        <p className="text-sm font-semibold">{data.status}</p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm">Método</p>
        <p className="text-sm font-semibold">{data.consumptionMethod}</p>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">Atualiza a cada 5s</p>
    </div>
  );
}