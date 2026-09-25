import { ReactNode } from "react";
import { AdminAuthProvider } from "@/context/AdminAuthContext";

export const metadata = {
  title: "Admin Portal | Lumieré",
  description: "Secure administrative console for Lumieré.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        {children}
      </div>
    </AdminAuthProvider>
  );
}
