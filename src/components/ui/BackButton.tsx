"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function BackButton({ label = "Voltar" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button variant="outline" size="sm" onClick={() => router.back()}>
      {label}
    </Button>
  );
}