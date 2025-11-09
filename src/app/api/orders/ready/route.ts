import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: "fsw-donalds" },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
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

  const payload = orders.map((o) => ({
    id: o.id,
    pickupName: o.pickupName,
    consumptionMethod: o.consumptionMethod,
    tableNumber: o.tableNumber ?? null,
    createdAt: o.createdAt.toISOString(),
    items: o.orderProducts.map((op) => ({ name: op.product?.name ?? "", quantity: op.quantity })),
  }));

  return NextResponse.json(payload);
}