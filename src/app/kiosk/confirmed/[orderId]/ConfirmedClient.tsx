"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export default function ConfirmedClient() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push("/kiosk");
    }
  }, [secondsLeft, router]);

  return (
    <div>
      <Button asChild className="w-full" variant="default">
        <Link href="/kiosk">Fechar e voltar ao Totem</Link>
      </Button>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Retornando em: {secondsLeft} segundos
      </p>
    </div>
  );
}