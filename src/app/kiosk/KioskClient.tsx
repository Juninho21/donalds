"use client";

import { useActionState, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  ingredients?: string[];
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

type CreateOrderResult = {
  success: boolean;
  orderId?: number;
  error?: string;
};

type Props = {
  categories: Category[];
  createOrderAction: (prevState: CreateOrderResult, formData: FormData) => Promise<CreateOrderResult>;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function KioskClient({ categories, createOrderAction }: Props) {
  const [cart, setCart] = useState<Record<string, { product: Product; quantity: number }>>({});
  const [consumptionMethod, setConsumptionMethod] = useState<"TAKEAWAY" | "DINE_IN">("TAKEAWAY");
  const [pickupName, setPickupName] = useState("");
  const [tableNumber, setTableNumber] = useState<number | "">("");
  const [state, formAction] = useActionState(createOrderAction, { success: false } as CreateOrderResult);
  const router = useRouter();

  const allProducts = useMemo(() => categories.flatMap((c) => c.products), [categories]);

  const subtotal = useMemo(
    () => Object.values(cart).reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const current = prev[product.id]?.quantity ?? 0;
      return { ...prev, [product.id]: { product, quantity: current + 1 } };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const nextQty = item.quantity - 1;
      const next = { ...prev };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = { ...item, quantity: nextQty };
      return next;
    });
  };

  const itemsPayload = useMemo(
    () =>
      JSON.stringify(
        Object.values(cart).map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      ),
    [cart],
  );

  useEffect(() => {
    if (state?.success && state.orderId) {
      router.push(`/kiosk/confirmed/${state.orderId}`);
    }
  }, [state?.success, state?.orderId, router]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {category.products.map((product) => (
                <div key={product.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="h-40 w-full overflow-hidden rounded-md">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={640}
                      height={320}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <h3 className="text-base font-medium">{product.name}</h3>
                    <span className="text-sm font-semibold text-primary">
                      {currency.format(product.price)}
                    </span>
                  </div>
                  {product.ingredients?.length ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {product.ingredients.join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => addToCart(product)} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Seu pedido</h3>
        <div className="mt-3 space-y-3">
          {Object.values(cart).length === 0 ? (
            <p className="text-sm text-muted-foreground">Carrinho vazio. Adicione itens.</p>
          ) : (
            Object.values(cart).map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {quantity} × {currency.format(product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => removeFromCart(product.id)}>
                    −
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addToCart(product)}>
                    +
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Subtotal</span>
            <span className="text-base font-semibold">{currency.format(subtotal)}</span>
          </div>
        </div>

        <form action={formAction} className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">Método de consumo</p>
            <div className="mt-2 flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="consumptionMethodRadio"
                  checked={consumptionMethod === "TAKEAWAY"}
                  onChange={() => setConsumptionMethod("TAKEAWAY")}
                />
                Retirada
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="consumptionMethodRadio"
                  checked={consumptionMethod === "DINE_IN"}
                  onChange={() => setConsumptionMethod("DINE_IN")}
                />
                Comer no local
              </label>
            </div>
          </div>

          {consumptionMethod === "TAKEAWAY" ? (
            <div>
              <p className="mt-4 text-sm font-medium">Nome para retirada</p>
              <input
                type="text"
                name="pickupName"
                value={pickupName}
                onChange={(e) => setPickupName(e.target.value)}
                placeholder="Ex.: João"
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div>
              <p className="mt-4 text-sm font-medium">Número da mesa</p>
              <input
                type="number"
                name="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : "")}
                placeholder="Ex.: 12"
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}

          <input type="hidden" name="consumptionMethod" value={consumptionMethod} />
          <input type="hidden" name="items" value={itemsPayload} />

          <Button type="submit" className="w-full" disabled={Object.values(cart).length === 0}>
            Finalizar pedido
          </Button>

          {state?.success ? (
            <p className="mt-2 text-sm text-green-600">Pedido #{state.orderId} criado com sucesso!</p>
          ) : state?.error ? (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}