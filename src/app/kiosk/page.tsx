import { prisma } from "@/lib/prisma";

import { createOrder } from "./actions";
import KioskClient from "./KioskClient";

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

// Server action 'createOrder' movida para './actions' para compatibilidade com
// as restrições de exports em páginas do Next 15.