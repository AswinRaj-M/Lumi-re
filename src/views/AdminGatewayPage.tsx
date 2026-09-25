"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminGatewayPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/admin/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
        <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">
          Verifying credentials...
        </span>
      </div>
    </div>
  );
}
