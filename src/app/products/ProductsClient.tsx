"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = { id: string; name: string; price: number; imageUrl: string; ingredients?: string[] };
type Category = { id: string; name: string; products: Product[] };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductsClient({ categories, restaurantName }: { categories: Category[]; restaurantName: string }) {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">("all");

  const filteredCategories = useMemo(() => {
    const match = (p: Product) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.ingredients || []).some((ing) => ing.toLowerCase().includes(q))
      );
    };

    return categories
      .filter((c) => selectedCategoryId === "all" || c.id === selectedCategoryId)
      .map((c) => ({ ...c, products: c.products.filter(match) }));
  }, [categories, query, selectedCategoryId]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">{restaurantName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Filtre por categoria e pesquise por nome/ingrediente</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64 rounded-md border px-3 py-2 text-sm"
        />

        <button
          className={`rounded-md border px-3 py-2 text-sm ${selectedCategoryId === "all" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          onClick={() => setSelectedCategoryId("all")}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`rounded-md border px-3 py-2 text-sm ${selectedCategoryId === c.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
            onClick={() => setSelectedCategoryId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-10">
        {filteredCategories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria com o filtro atual.</p>
              ) : (
                category.products.map((product) => (
                  <div key={product.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="h-40 w-full overflow-hidden rounded-md">
                      <Image src={product.imageUrl} alt={product.name} width={640} height={320} className="h-40 w-full object-cover" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <h3 className="text-base font-medium">{product.name}</h3>
                      <span className="text-sm font-semibold text-primary">{currency.format(product.price)}</span>
                    </div>
                    {product.ingredients?.length ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.ingredients.join(", ")}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}