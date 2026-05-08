'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BellRing, CalendarDays, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href:'/barber/dashboard', icon:LayoutDashboard, label:'Dashboard' },
  { href:'/barber/requests',  icon:BellRing,        label:'Requests' },
  { href:'/barber/schedule',  icon:CalendarDays,    label:'Schedule' },
  { href:'/barber/earnings',  icon:Wallet,          label:'Earnings' },
];

export default function BarberNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass-dark border-t border-gold/10 pb-safe">
      <div className="flex max-w-lg mx-auto">
        {NAV.map(({href,icon:Icon,label})=>{
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} className={cn('flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors',
              active?'text-gold':'text-ink-400 hover:text-ink-200')}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',active&&'bg-gold/12')}>
                <Icon className="w-5 h-5" strokeWidth={active?2.5:1.75}/>
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
