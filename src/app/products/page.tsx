import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ProductPage = async () => {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: "fsw-donalds" },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Restaurante não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique se o seed foi executado corretamente.
        </p>
      </div>
    );
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    include: { products: true },
    orderBy: { name: "asc" },
  });

  return <ProductsClient categories={categories} restaurantName={restaurant.name} />;
};

export default ProductPage;
