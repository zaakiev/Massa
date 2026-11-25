import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await requireSession())) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <div className="app-screen">{children}</div>
    </div>
  );
}