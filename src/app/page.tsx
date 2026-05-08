'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Scissors, Phone, KeyRound, ArrowRight, Loader2, MapPin, Star, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp' | 'role';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectByRole(session.user.id);
      else setChecking(false);
    });
  }, []);

  async function redirectByRole(uid: string) {
    const { data } = await supabase.from('users').select('role').eq('id', uid).single();
    router.replace(data?.role === 'barber' ? '/barber/dashboard' : '/home');
  }

  async function sendOTP() {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setLoading(false);
    if (error) setError(error.message);
    else setStep('otp');
  }

  async function verifyOTP() {
    if (otp.length < 4) { setError('Enter the OTP'); return; }
    setError(''); setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`, token: otp, type: 'sms',
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) {
      const { data: existing } = await supabase.from('users').select('role').eq('id', data.user.id).single();
      if (existing) redirectByRole(data.user.id);
      else setStep('role');
    }
  }

  async function chooseRole(role: 'user' | 'barber') {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    await supabase.from('users').upsert({ id: user.id, phone: `+91${phone}`, name: '', role });
    if (role === 'barber') {
      await supabase.from('barbers').upsert({
        user_id: user.id, name: 'New Barber', phone: `+91${phone}`,
        lat: 28.6139, lng: 77.2090, address: 'Update your address', is_available: false,
      });
    }
    setLoading(false);
    router.replace(role === 'barber' ? '/barber/dashboard' : '/home');
  }

  if (checking) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border-2 border-t-gold animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">✂️</span>
      </div>
    </div>
  );

  return (
    <div className="page-bg min-h-screen flex flex-col lg:flex-row">
      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-20 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rust/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-14">
          <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
            <Scissors className="w-5 h-5 text-ink-900" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl font-bold text-cream">CutRight</span>
        </div>

        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-5">Premium Grooming · On Demand</p>
        <h1 className="font-display text-5xl lg:text-6xl font-black leading-[1.05] mb-6 text-cream">
          Your Perfect<br /><span className="text-gradient">Barber</span> Awaits.
        </h1>
        <p className="text-ink-300 text-lg leading-relaxed mb-10 max-w-md font-light">
          Book trusted barbers near you in seconds. Real‑time matching, transparent pricing, professional results — every time.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm">
          {[['2,400+','Expert Barbers'],['4.8★','Avg Rating'],['48K+','Happy Clients']].map(([v,l]) => (
            <div key={l} className="card text-center py-4">
              <p className="font-display text-gold font-bold text-lg">{v}</p>
              <p className="text-ink-300 text-[11px] mt-1">{l}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {[[MapPin,'Nearby barbers'],[Clock,'30 min arrival'],[Star,'Top rated'],[Users,'2400+ barbers']].map(([Icon,label]: any) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-ink-200">
              <Icon className="w-3.5 h-3.5 text-gold" />{label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Auth form ── */}
      <div className="w-full lg:w-[460px] flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">

          {step === 'phone' && (
            <div className="animate-fade-in">
              <h2 className="font-display text-3xl font-bold text-cream mb-2">Get Started</h2>
              <p className="text-ink-300 text-sm mb-8">Enter your mobile number to continue</p>
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-ink-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                  <span className="text-cream text-sm font-medium">+91</span>
                  <span className="text-ink-600 text-lg leading-none">|</span>
                </div>
                <input
                  className="input pl-[88px] text-xl font-mono tracking-widest"
                  placeholder="98765 43210"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  onKeyDown={e => e.key==='Enter' && sendOTP()}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button className="btn-primary" onClick={sendOTP} disabled={loading||phone.length!==10}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-ink-500 text-xs text-center mt-5 leading-relaxed">
                By continuing you agree to our Terms & Privacy Policy.<br/>Standard SMS charges may apply.
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div className="animate-fade-in">
              <h2 className="font-display text-3xl font-bold text-cream mb-2">Verify OTP</h2>
              <p className="text-ink-300 text-sm mb-8">Sent to <span className="text-cream">+91 {phone}</span></p>
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <KeyRound className="w-4 h-4 text-ink-400" />
                </div>
                <input
                  className="input pl-12 text-center text-3xl font-mono tracking-[0.6em]"
                  placeholder="······"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  onKeyDown={e => e.key==='Enter' && verifyOTP()}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button className="btn-primary mb-3" onClick={verifyOTP} disabled={loading||otp.length<4}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Verify &amp; Continue</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button className="btn-secondary" onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
                ← Change number
              </button>
            </div>
          )}

          {step === 'role' && (
            <div className="animate-fade-in">
              <h2 className="font-display text-3xl font-bold text-cream mb-2">Welcome!</h2>
              <p className="text-ink-300 text-sm mb-8">How would you like to use CutRight?</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { role: 'user' as const, emoji: '👤', label: 'Customer', desc: 'Book barbers near me' },
                  { role: 'barber' as const, emoji: '✂️', label: 'Barber', desc: 'Accept bookings & earn' },
                ].map(({ role, emoji, label, desc }) => (
                  <button
                    key={role}
                    onClick={() => chooseRole(role)}
                    disabled={loading}
                    className="card hover:border-gold/40 active:scale-95 transition-all flex flex-col items-center gap-3 py-6 cursor-pointer"
                  >
                    <span className="text-4xl">{emoji}</span>
                    <span className="text-cream font-semibold text-sm">{label}</span>
                    <span className="text-ink-400 text-xs text-center leading-relaxed">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
