import { prisma } from "@/lib/prisma";
import OrderStatusClient from "../OrderStatusClient";

type Props = { params: { orderId: string } };

export default async function OrderStatusPage({ params }: Props) {
  const id = Number(params.orderId);
  if (Number.isNaN(id)) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Pedido inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">Identificador do pedido não é um número.</p>
      </div>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, consumptionMethod: true, total: true },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Pedido não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verifique o número e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-3xl font-bold">Status do pedido #{order.id}</h1>
      <OrderStatusClient orderId={order.id} initial={{ status: order.status, total: order.total, consumptionMethod: order.consumptionMethod }} />
    </div>
  );
}