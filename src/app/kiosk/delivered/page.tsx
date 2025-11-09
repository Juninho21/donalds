import BackButton from "@/components/ui/BackButton";

import DeliveredClient from "./DeliveredClient";

export default function DeliveredPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Histórico de entrega</h1>
        <BackButton />
      </div>
      {/* Texto de atualização automática removido conforme solicitação */}
      <DeliveredClient initial={[]} />
    </div>
  );
}