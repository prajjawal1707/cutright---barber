# ✂️ CutRight — Barber Booking Platform

A production-ready, full-stack barber booking app with real-time matching, Razorpay payments, and live booking status updates.

---

## 🚀 Run Locally in 5 Steps

### 1. Install dependencies
```bash
npm install
```

### 2. Create your environment file
```bash
cp .env.example .env.local
```

### 4. Fill in `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional — leave blank for demo/mock payment mode
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Optional — map falls back gracefully without this
NEXT_PUBLIC_GOOGLE_MAPS_KEY=xxx
```

### 5. Start the dev server
```bash
npm run dev
```
Open **http://localhost:3000** 🎉

---

## 📱 App Flows

### Customer
| Route | Page |
|-------|------|
| `/` | Landing + OTP phone login |
| `/home` | Home dashboard with services |
| `/barbers` | Nearby barbers list |
| `/book` | 3-step booking flow |
| `/booking` | My bookings list |
| `/booking/[id]` | Live booking detail + payment |
| `/rate/[id]` | Rate your barber |
| `/profile` | Account settings |

### Barber
| Route | Page |
|-------|------|
| `/barber/dashboard` | Stats + toggle availability |
| `/barber/requests` | Real-time incoming requests (accept/decline) |
| `/barber/schedule` | Calendar view of bookings |
| `/barber/earnings` | Revenue & transaction history |

---

## 💳 Payment (Demo Mode)

- **Without Razorpay keys** → App runs in demo mode. Pay button marks booking as paid instantly with no real transaction.
- **With Razorpay keys** → Full checkout flow with signature verification.

Get free test keys at [razorpay.com/docs/payments/dashboard/get-api-keys](https://razorpay.com/docs/payments/dashboard/get-api-keys/)

---

## ⚡ Real-time Flow

```
Customer books
     ↓
API notifies nearby barbers (writes to notifications table)
     ↓
Barber's /requests page receives INSERT event via Supabase channel
     ↓
Barber clicks Accept → booking.status = 'accepted', booking.barber_id = barber.id
     ↓
Customer's /booking/[id] receives UPDATE event → UI updates live
```

---

## 🗄️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v3 |
| Auth | Supabase Auth (SMS OTP) |
| Database | Supabase PostgreSQL + PostGIS |
| Realtime | Supabase Realtime subscriptions |
| Payments | Razorpay (with demo fallback) |
| Language | TypeScript |

---

## 🚢 Deploy to Vercel

```bash
npx vercel
```
Add all `.env.local` variables in Vercel → Project → Settings → Environment Variables.
