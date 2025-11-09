-- CreateTable
CREATE TABLE "DeliveredOrder" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "pickupName" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "consumptionMethod" "ConsumptionMethod" NOT NULL,

    CONSTRAINT "DeliveredOrder_pkey" PRIMARY KEY ("id")
);
