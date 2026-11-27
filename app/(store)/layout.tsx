import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getWalletBalance } from "@/lib/services/wallet";
import { Header } from "@/components/store/header";
import { MobileNav } from "@/components/store/mobile-nav";
import { SiteFooter } from "@/components/store/footer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ user }, settings] = await Promise.all([getSession(), getSettings()]);
  const balance = user ? await getWalletBalance(user.id) : 0;

  return (
    <div className="pb-24 md:pb-0">
      <Header user={user} balance={balance} supportUrl={settings.supportUrl} />
      {settings.maintenanceMode && (
        <div className="bg-amber-100 px-3 py-2 text-center text-xs font-medium text-amber-800">
          We are performing maintenance. Orders may take a little longer than usual.
        </div>
      )}
      <main>{children}</main>
      <SiteFooter />
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
