'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Edit2, Save, Loader2 } from 'lucide-react';
import { avatarUrl } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data:{user:au} } = await supabase.auth.getUser();
    if (!au) { router.replace('/'); return; }
    const { data } = await supabase.from('users').select('*').eq('id',au.id).single();
    setUser(data); setName(data?.name||''); setLoading(false);
  }

  async function save() {
    setSaving(true);
    await supabase.from('users').update({name}).eq('id',user.id);
    setUser({...user,name}); setEditing(false); setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin"/></div>;

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl font-bold text-cream">Profile</h1>
      </header>

      <div className="px-5 flex flex-col gap-4 pb-6">
        <div className="card text-center py-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 bg-gold/10">
            <Image src={user?.avatar_url||avatarUrl(user?.name||'U')} alt="avatar" width={80} height={80} className="w-full h-full object-cover"/>
          </div>
          {editing ? (
            <div className="flex gap-2 max-w-xs mx-auto">
              <input className="input text-center flex-1" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
              <button onClick={save} disabled={saving} className="w-12 bg-gold rounded-xl flex items-center justify-center text-ink-900 flex-shrink-0">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-display text-xl font-bold text-cream">{user?.name||'No name set'}</h2>
              <button onClick={()=>setEditing(true)}><Edit2 className="w-4 h-4 text-ink-500 hover:text-gold transition-colors"/></button>
            </div>
          )}
          <p className="text-ink-400 text-sm mt-2">{user?.phone}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs capitalize">{user?.role}</span>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-cream text-sm">Account Info</h3>
          {[
            ['Phone', user?.phone],
            ['Role', user?.role],
            ['Member since', format(new Date(user?.created_at||Date.now()),'MMMM yyyy')],
          ].map(([l,v])=>(
            <div key={l} className="flex justify-between text-sm">
              <span className="text-ink-400">{l}</span><span className="text-cream capitalize">{v}</span>
            </div>
          ))}
        </div>

        <button onClick={signOut} className="btn-danger">
          <LogOut className="w-4 h-4"/>Sign Out
        </button>
      </div>
    </div>
  );
}
