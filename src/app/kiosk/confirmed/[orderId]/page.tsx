import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ConfirmedClient from "./ConfirmedClient";

type Props = {
  params: { orderId: string };
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function OrderConfirmedPage({ params }: Props) {
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
    include: {
      orderProducts: {
        include: { product: { select: { name: true } } },
      },
      restaurant: { select: { name: true } },
    },
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
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedido #{order.id} confirmado</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.restaurant?.name}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="text-sm font-semibold">{order.status}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Método</p>
            <p className="text-sm font-semibold">{order.consumptionMethod}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {order.pickupName ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Retirada</p>
              <p className="text-sm font-semibold">{order.pickupName}</p>
            </div>
          ) : (
            <div />
          )}
          {order.tableNumber ? (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mesa</p>
              <p className="text-sm font-semibold">{order.tableNumber}</p>
            </div>
          ) : (
            <div />
          )}
        </div>

        <div className="my-6 border-t border-dashed" />

        <div>
          <h2 className="text-base font-semibold">Itens</h2>
          <div className="mt-3 space-y-3">
            {order.orderProducts.map((op) => (
              <div key={op.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{op.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {op.quantity} × {currency.format(op.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{currency.format(op.price * op.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="my-6 border-t border-dashed" />

        <div className="flex items-center justify-between">
          <span className="text-sm">Total</span>
          <span className="text-lg font-bold">{currency.format(order.total)}</span>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Obrigado pela preferência!</p>
      </div>

      <div className="mt-4">
        <ConfirmedClient />
      </div>
    </div>
  );
}