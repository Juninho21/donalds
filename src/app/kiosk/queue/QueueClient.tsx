"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type OrderSummary = {
  id: number;
  status: "PENDING" | "IN_PREPARATION";
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function QueueClient({ initial }: { initial: OrderSummary[] }) {
  const [orders, setOrders] = useState<OrderSummary[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [polling, setPolling] = useState(true);
  const [now, setNow] = useState<number>(Date.now());
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const refreshAbortRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef(false);
  const backoffMsRef = useRef(5000);
  const mountedRef = useRef(true);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const refresh = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/orders/in-progress", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao buscar pedidos");
      const json: OrderSummary[] = await res.json();
      setOrders(json);
      setError(null);
      backoffMsRef.current = 5000;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Não foi possível atualizar a fila.");
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
      setIsRefreshing(false);
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
      setIsRefreshing(true);
      await refresh(controller.signal).finally(() => {
        setIsRefreshing(false);
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

  const pending = useMemo(() => orders.filter((o) => o.status === "PENDING"), [orders]);
  const preparing = useMemo(() => orders.filter((o) => o.status === "IN_PREPARATION"), [orders]);

  const statusStyles: Record<OrderSummary["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    IN_PREPARATION: "bg-blue-100 text-blue-800 border border-blue-200",
  };

  const statusLabels: Record<OrderSummary["status"], string> = {
    PENDING: "PENDENTE",
    IN_PREPARATION: "EM PREPARO",
  };

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const formatRelative = (iso: string) => {
    const diffMs = new Date(iso).getTime() - now; // negativo para passado
    const seconds = Math.round(diffMs / 1000);
    const abs = Math.abs(seconds);
    if (abs < 60) return rtf.format(seconds, "second");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    const days = Math.round(hours / 24);
    return rtf.format(days, "day");
  };

  const confirmOrder = async (id: number) => {
    if (processing.has(id)) return;
    const next = new Set(processing);
    next.add(id);
    setProcessing(next);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PREPARATION" }),
      });
      if (!res.ok) throw new Error("Falha ao confirmar pedido");
      const updated: OrderSummary = await res.json();
      setOrders((curr) => curr.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
      setError(null);
    } catch (e) {
      setError("Não foi possível confirmar o pedido.");
    } finally {
      setProcessing((curr) => {
        const cp = new Set(curr);
        cp.delete(id);
        return cp;
      });
    }
  };

  const finishOrder = async (id: number) => {
    if (processing.has(id)) return;
    const next = new Set(processing);
    next.add(id);
    setProcessing(next);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINISHED" }),
      });
      if (!res.ok) throw new Error("Falha ao finalizar preparo");
      const updated = (await res.json()) as { id: number; status: "PENDING" | "IN_PREPARATION" | "FINISHED" };
      // Remover imediatamente da fila ao finalizar
      if (updated.status === "FINISHED") {
        setOrders((curr) => curr.filter((o) => o.id !== id));
      }
      setError(null);
    } catch (e) {
      setError("Não foi possível finalizar o preparo.");
    } finally {
      setProcessing((curr) => {
        const cp = new Set(curr);
        cp.delete(id);
        return cp;
      });
    }
  };

  const renderCard = (o: OrderSummary) => (
    <div key={o.id} className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Pedido #{o.id}</p>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[o.status]}`}>
            {statusLabels[o.status]}
          </span>
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
      <p className="mt-2 text-xs text-muted-foreground">Criado {formatRelative(o.createdAt)}</p>
      {o.status === "PENDING" ? (
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => confirmOrder(o.id)}
            disabled={processing.has(o.id)}
          >
            {processing.has(o.id) ? "Confirmando..." : "Confirmar"}
          </Button>
        </div>
      ) : o.status === "IN_PREPARATION" ? (
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => finishOrder(o.id)}
            disabled={processing.has(o.id)}
          >
            {processing.has(o.id) ? "Finalizando..." : "Finalizar preparo"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="mt-6">
      {/* Controles de atualização removidos conforme solicitação */}
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Pendentes</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              pending.map(renderCard)
            )}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Em preparo</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {preparing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido em preparo.</p>
            ) : (
              preparing.map(renderCard)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}