-- CreateTable
CREATE TABLE "DeliveredOrderProduct" (
    "id" TEXT NOT NULL,
    "deliveredOrderId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveredOrderProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliveredOrderProduct" ADD CONSTRAINT "DeliveredOrderProduct_deliveredOrderId_fkey" FOREIGN KEY ("deliveredOrderId") REFERENCES "DeliveredOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveredOrderProduct" ADD CONSTRAINT "DeliveredOrderProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
