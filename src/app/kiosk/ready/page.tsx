import { prisma } from "@/lib/prisma";
import ReadyClient from "./ReadyClient";
import Link from "next/link";

export default async function ReadyPage() {
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
    where: {
      restaurantId: restaurant.id,
      status: "FINISHED",
      consumptionMethod: { in: ["TAKEAWAY", "DINE_IN"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      pickupName: true,
      consumptionMethod: true,
      tableNumber: true,
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
        <h1 className="text-3xl font-bold">Pedidos prontos — {restaurant.name}</h1>
        <Link
          href="/kiosk/delivered"
          className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Histórico
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Aguardando retirada.</p>
      <ReadyClient
        initial={orders.map((o) => ({
          id: o.id,
          pickupName: o.pickupName,
          consumptionMethod: o.consumptionMethod,
          tableNumber: o.tableNumber ?? null,
          createdAt: o.createdAt.toISOString(),
          items: o.orderProducts.map((op) => ({ name: op.product?.name ?? "", quantity: op.quantity })),
        }))}
      />
    </div>
  );
}