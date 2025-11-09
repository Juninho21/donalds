"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DeliveredOrder = {
  id: number;
  pickupName: string | null;
  consumptionMethod: "TAKEAWAY" | "DINE_IN";
  deliveredAt: string;
  items: { name: string; quantity: number }[];
};

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function formatRelative(iso: string) {
  const now = Date.now();
  const diffMs = new Date(iso).getTime() - now;
  const seconds = Math.round(diffMs / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(days, "day");
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function DeliveredClient({ initial }: { initial: DeliveredOrder[] }) {
  const [orders, setOrders] = useState<DeliveredOrder[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef(false);
  const backoffMsRef = useRef(5000);
  const mountedRef = useRef(true);

  const refresh = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/orders/delivered", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao buscar entregues");
      const json: DeliveredOrder[] = await res.json();
      setOrders(json);
      setError(null);
      backoffMsRef.current = 5000;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Não foi possível atualizar o histórico.");
      backoffMsRef.current = Math.min(backoffMsRef.current * 2, 60000);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const visibilityHandler = () => {
      if (document.visibilityState === "hidden") setPolling(false);
      else setPolling(true);
    };
    document.addEventListener("visibilitychange", visibilityHandler);
    const onlineHandler = () => setPolling(true);
    const offlineHandler = () => setPolling(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    if (!polling) {
      if (refreshAbortRef.current) refreshAbortRef.current.abort();
      refreshInFlightRef.current = false;
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled || !mountedRef.current) return;
      if (refreshInFlightRef.current) {
        const delay = backoffMsRef.current;
        setTimeout(tick, delay);
        return;
      }
      refreshInFlightRef.current = true;
      const controller = new AbortController();
      refreshAbortRef.current = controller;
      await refresh(controller.signal).finally(() => {
        refreshInFlightRef.current = false;
      });
      const base = backoffMsRef.current;
      const jitter = Math.floor(base * (0.8 + Math.random() * 0.4));
      setTimeout(tick, jitter);
    };
    tick();
    return () => {
      cancelled = true;
      if (refreshAbortRef.current) refreshAbortRef.current.abort();
      refreshInFlightRef.current = false;
    };
  }, [polling]);

  const list = useMemo(() => orders, [orders]);

  return (
    <div className="mt-6">
      {/* Controles de atualização removidos conforme solicitação */}

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido entregue ainda.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => (
            <li key={o.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{o.pickupName ? o.pickupName : `Pedido #${o.id}`}</p>
                  {o.consumptionMethod === "TAKEAWAY" ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Retirada</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">Comer no local</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Entregue {formatRelative(o.deliveredAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.deliveredAt)}</p>
                </div>
              </div>
              {o.items && o.items.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {o.items.map((it, idx) => (
                    <li key={idx}>
                      {it.quantity} × {it.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}