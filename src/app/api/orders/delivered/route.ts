import { Prisma } from "@prisma/client";
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

  const orders = await prisma.deliveredOrder.findMany({
    where: {
      restaurantId: restaurant.id,
      consumptionMethod: { in: ["TAKEAWAY", "DINE_IN"] },
    },
    orderBy: { deliveredAt: "desc" },
    select: { id: true, pickupName: true, deliveredAt: true, consumptionMethod: true },
    take: 100,
  });

  const ids = orders.map((o) => o.id);
  const itemsByDeliveredId = new Map<number, { name: string; quantity: number }[]>();
  if (ids.length > 0) {
    const rows = await prisma.$queryRaw<Array<{ deliveredOrderId: number; name: string; quantity: number }>>`
      SELECT dop."deliveredOrderId" AS "deliveredOrderId", p."name" AS "name", dop."quantity" AS "quantity"
      FROM "DeliveredOrderProduct" AS dop
      INNER JOIN "Product" AS p ON p."id" = dop."productId"
      WHERE dop."deliveredOrderId" IN (${Prisma.join(ids)})
      ORDER BY dop."deliveredOrderId" ASC
    `;
    for (const r of rows) {
      const arr = itemsByDeliveredId.get(r.deliveredOrderId) ?? [];
      arr.push({ name: r.name, quantity: r.quantity });
      itemsByDeliveredId.set(r.deliveredOrderId, arr);
    }
  }

  const payload = orders.map((o) => ({
    id: o.id,
    pickupName: o.pickupName,
    consumptionMethod: o.consumptionMethod,
    deliveredAt: o.deliveredAt.toISOString(),
    items: itemsByDeliveredId.get(o.id) ?? [],
  }));

  return NextResponse.json(payload);
}