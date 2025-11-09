import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      consumptionMethod: true,
      updatedAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const status = (body as { status?: string }).status;
  if (status !== "IN_PREPARATION" && status !== "PENDING" && status !== "FINISHED" && status !== "DELIVERED") {
    return NextResponse.json({ error: "Status não suportado" }, { status: 400 });
  }

  // Opcional: garantir transição válida (PENDING -> IN_PREPARATION)
  const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!current) {
    // Idempotência para entrega: se já foi arquivado e removido, considerar sucesso
    if (status === "DELIVERED") {
      const archived = await prisma.deliveredOrder.findFirst({ where: { orderId: id }, select: { id: true } });
      if (archived) {
        return NextResponse.json({ id, status: "DELIVERED" });
      }
    }
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Idempotência: se já estiver no status solicitado, apenas retorne o atual
  if (current.status === status) {
    const same = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, total: true, createdAt: true },
    });
    return NextResponse.json(same);
  }

  if (current.status === "PENDING" && status !== "IN_PREPARATION") {
    return NextResponse.json({ error: "Transição inválida" }, { status: 400 });
  }
  if (current.status === "IN_PREPARATION" && status !== "FINISHED") {
    return NextResponse.json({ error: "Transição inválida" }, { status: 400 });
  }
  // Se for entrega, arquiva no histórico e exclui o pedido
  if (status === "DELIVERED") {
    if (current.status !== "FINISHED") {
      return NextResponse.json({ error: "Transição inválida" }, { status: 400 });
    }
    const full = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        pickupName: true,
        restaurantId: true,
        consumptionMethod: true,
        total: true,
        createdAt: true,
        orderProducts: { select: { productId: true, quantity: true, price: true } },
      },
    });
    if (!full) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.deliveredOrder.create({
          data: {
            orderId: full.id,
            pickupName: full.pickupName ?? null,
            restaurantId: full.restaurantId,
            consumptionMethod: full.consumptionMethod,
          },
          select: { id: true },
        });

        if (full.orderProducts && full.orderProducts.length > 0) {
          for (const op of full.orderProducts) {
            // Inserir item do pedido entregue no histórico
            await tx.$executeRaw`
              INSERT INTO "DeliveredOrderProduct" ("id", "deliveredOrderId", "productId", "quantity", "price", "updatedAt")
              VALUES (${randomUUID()}, ${created.id}, ${op.productId}, ${op.quantity}, ${op.price}, ${new Date()})
            `;
          }
        }
        await tx.order.delete({ where: { id } });
      });
      return NextResponse.json({ id, status: "DELIVERED" });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        return NextResponse.json(
          { error: `Falha ao finalizar entrega: ${e.code}` },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Erro interno ao finalizar entrega" },
        { status: 500 },
      );
    }
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as any },
      select: { id: true, status: true, total: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Falha ao atualizar pedido: ${e.code}` },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro interno ao atualizar pedido" },
      { status: 500 },
    );
  }
}