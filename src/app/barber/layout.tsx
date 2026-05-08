import BarberNav from '@/components/barber/BarberNav';

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-bg min-h-screen">
      <main className="pb-24">{children}</main>
      <BarberNav />
    </div>
  );
}
