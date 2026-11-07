import SettingsForm from "@/features/settings/components/SettingsForm";
import { loadSettingsForm } from "@/lib/pos/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const initial = await loadSettingsForm();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">Currency, tax and receipt details used by the POS.</p>
      <div className="mt-8">
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}
