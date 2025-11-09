import { prisma } from "@/lib/prisma";

import QueueClient from "./QueueClient";
// Botão de histórico removido conforme solicitação

export default async function QueuePage() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: "fsw-donalds" },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Restaurante não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Execute o seed e tente novamente.</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, status: { in: ["PENDING", "IN_PREPARATION"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      orderProducts: {
        select: {
          quantity: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fila de pedidos — {restaurant.name}</h1>
      </div>
      {/* Texto de atualização automática removido conforme solicitação */}
  <QueueClient
        initial={orders.map((o) => ({
          id: o.id,
          status: o.status === "PENDING" ? "PENDING" : "IN_PREPARATION",
          total: o.total,
          createdAt: o.createdAt.toISOString(),
          items: o.orderProducts.map((op) => ({ name: op.product?.name ?? "", quantity: op.quantity })),
        }))}
      />
    </div>
  );
}