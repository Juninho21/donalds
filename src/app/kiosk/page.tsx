import { prisma } from "@/lib/prisma";
import KioskClient from "./KioskClient";
import { revalidatePath } from "next/cache";

export default async function KioskPage() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: "fsw-donalds" },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Restaurante não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Execute o seed para inserir dados e tente novamente.
        </p>
      </div>
    );
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    include: { products: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Totem — {restaurant.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecione itens, escolha o método de consumo e finalize o pedido.
      </p>
      <div className="mt-6">
        <KioskClient categories={categories} createOrderAction={createOrder.bind(null, restaurant.id)} />
      </div>
    </div>
  );
}

export type CreateOrderResult = {
  success: boolean;
  orderId?: number;
  error?: string;
};

export async function createOrder(
  restaurantId: string,
  prevState: CreateOrderResult,
  formData: FormData,
): Promise<CreateOrderResult> {
  "use server";
  try {
    const consumptionMethod = String(formData.get("consumptionMethod") || "TAKEAWAY");
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
        consumptionMethod: consumptionMethod as any,
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
  } catch (err) {
    return { success: false, error: "Falha ao criar pedido" };
  }
}