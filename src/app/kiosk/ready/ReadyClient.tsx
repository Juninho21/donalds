"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ReadyOrder = {
  id: number;
  pickupName: string | null;
  consumptionMethod: "TAKEAWAY" | "DINE_IN";
  tableNumber: number | null;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

export default function ReadyClient({ initial }: { initial: ReadyOrder[] }) {
  const [orders, setOrders] = useState<ReadyOrder[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [polling, setPolling] = useState(true);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef(false);
  const backoffMsRef = useRef(5000);
  const mountedRef = useRef(true);

  const refresh = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/orders/ready", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao buscar pedidos prontos");
      const json: ReadyOrder[] = await res.json();
      setOrders(json);
      setError(null);
      backoffMsRef.current = 5000;
    } catch (e) {
      // Silencia cancelamentos de requisição no dev/HMR
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Não foi possível atualizar a lista.");
      backoffMsRef.current = Math.min(backoffMsRef.current * 2, 60000);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        // Pausa polling ao ocultar aba
        setPolling(false);
      } else {
        setPolling(true);
      }
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
      // Aborta requisição em andamento e limpa estado de refresh
      if (refreshAbortRef.current) refreshAbortRef.current.abort();
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
      return;
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled || !mountedRef.current) return;
      if (refreshInFlightRef.current) {
        // Evita sobreposição; agenda próxima tentativa
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
      // Jitter de 20% para evitar thundering herd
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
  const takeaway = useMemo(() => list.filter((o) => o.consumptionMethod === "TAKEAWAY"), [list]);
  const dineIn = useMemo(() => list.filter((o) => o.consumptionMethod === "DINE_IN"), [list]);

  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const deliverAbortRef = useRef<AbortController | null>(null);
  const markDelivered = async (id: number) => {
    if (processing.has(id)) return;
    const next = new Set(processing);
    next.add(id);
    setProcessing(next);
    try {
      const controller = new AbortController();
      deliverAbortRef.current = controller;
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Tenta extrair mensagem detalhada do servidor
        const err = await res.json().catch(() => null);
        const msg = (err && err.error) ? err.error : "Falha ao marcar como entregue";
        throw new Error(msg);
      }
      const updated = await res.json();
      if (updated.status === "DELIVERED") {
        setOrders((curr) => curr.filter((o) => o.id !== id));
      }
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Ignora cancelamentos ao navegar/atualizar
      } else {
        setError(e instanceof Error ? e.message : "Não foi possível marcar como entregue.");
      }
    } finally {
      setProcessing((curr) => {
        const cp = new Set(curr);
        cp.delete(id);
        return cp;
      });
      if (deliverAbortRef.current) {
        deliverAbortRef.current = null;
      }
    }
  };

  return (
    <div className="mt-6">
      <div className="mb-4">
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
          Prontos: {list.length}
        </span>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido pronto para retirada.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Retirada</h2>
            <ol className="space-y-2">
              {takeaway.map((o, idx) => (
                <li key={o.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {o.pickupName ? o.pickupName : `Pedido #${o.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Aguardando retirada</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Retirada</span>
                  </div>
                  {o.items && o.items.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {o.items.map((it, idx2) => (
                        <li key={idx2}>
                          {it.quantity} × {it.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3">
                    <Button size="sm" onClick={() => markDelivered(o.id)} disabled={processing.has(o.id)}>
                      {processing.has(o.id) ? "Entregando..." : "Entregue"}
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Comer no local</h2>
            <ol className="space-y-2">
              {dineIn.map((o, idx) => (
                <li key={o.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {o.pickupName ? o.pickupName : `Pedido #${o.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Aguardando retirada</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">Comer no local</span>
                      {typeof o.tableNumber === "number" ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 gap-1">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M3 7h18v3H3V7zm2 3h2v7H5v-7zm12 0h2v7h-2v-7zm-8 0h8v2H9v-2z" />
                          </svg>
                          <span>Mesa: {o.tableNumber}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {o.items && o.items.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {o.items.map((it, idx2) => (
                        <li key={idx2}>
                          {it.quantity} × {it.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3">
                    <Button size="sm" onClick={() => markDelivered(o.id)} disabled={processing.has(o.id)}>
                      {processing.has(o.id) ? "Entregando..." : "Entregue"}
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}