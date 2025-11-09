"use server";

import type { ConsumptionMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type CreateOrderResult = {
  success: boolean;
  orderId?: number;
  error?: string;
};

export async function createOrder(
  restaurantId: string,
  _prevState: CreateOrderResult,
  formData: FormData,
): Promise<CreateOrderResult> {
  try {
    const consumptionMethod = String(formData.get("consumptionMethod") || "TAKEAWAY") as ConsumptionMethod;
    const itemsRaw = String(formData.get("items") || "[]");
    const items: Array<{ productId: string; quantity: number }> = JSON.parse(itemsRaw);
    const pickupName = formData.get("pickupName") ? String(formData.get("pickupName")) : null;
    const tableNumber = formData.get("tableNumber") ? Number(formData.get("tableNumber")) : null;

    if (!items.length) {
      return { success: false, error: "Carrinho vazio" };
    }

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, restaurantId },
      select: { id: true, price: true },
    });

    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    const total = items.reduce((sum, i) => sum + (priceMap.get(i.productId) || 0) * i.quantity, 0);

    const order = await prisma.order.create({
      data: {
        total,
        status: "PENDING",
        consumptionMethod,
        pickupName: consumptionMethod === "TAKEAWAY" ? pickupName : null,
        tableNumber: consumptionMethod === "DINE_IN" ? tableNumber : null,
        restaurantId,
      },
    });

    await prisma.orderProduct.createMany({
      data: items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        price: priceMap.get(i.productId) || 0,
      })),
    });

    revalidatePath("/kiosk");
    return { success: true, orderId: order.id };
  } catch {
    return { success: false, error: "Falha ao criar pedido" };
  }
}