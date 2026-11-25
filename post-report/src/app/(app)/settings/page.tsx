import { seedDefaultShiftsIfEmpty } from "@/lib/directories";
import SettingsPanel from "./SettingsPanel";

export default async function SettingsPage() {
  await seedDefaultShiftsIfEmpty();
  return <SettingsPanel />;
}