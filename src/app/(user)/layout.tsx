import BottomNav from '@/components/shared/BottomNav';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-bg min-h-screen">
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
