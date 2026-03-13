# 💡 Genius Backend API

Backend لـ Genius Study Manager — مبني على **Vercel Serverless Functions** + **Firebase Admin**.

---

## 📁 هيكل المشروع

```
genius-backend/
├── api/
│   ├── health.js        ← Health check
│   ├── auth.js          ← Token verification
│   ├── sync.js          ← Cloud Sync (push/pull)
│   ├── leaderboard.js   ← Leaderboard
│   ├── push.js          ← Push Notifications
│   └── ai.js            ← AI Study Assistant
├── lib/
│   └── firebase.js      ← Firebase Admin singleton
├── middleware/
│   ├── auth.js          ← JWT verification
│   └── cors.js          ← CORS headers
├── package.json
├── vercel.json
└── README.md
```

---

## 🔌 API Endpoints

| Method   | Endpoint                    | Description              | Auth |
|----------|-----------------------------|--------------------------|------|
| `GET`    | `/api/health`               | Health check             | ❌   |
| `GET`    | `/api/auth`                 | Verify token             | ✅   |
| `GET`    | `/api/sync`                 | Pull user data           | ✅   |
| `POST`   | `/api/sync`                 | Push user data           | ✅   |
| `DELETE` | `/api/sync`                 | Delete user data         | ✅   |
| `GET`    | `/api/leaderboard`          | Top 20 players           | ✅   |
| `POST`   | `/api/leaderboard`          | Update my score          | ✅   |
| `DELETE` | `/api/leaderboard`          | Remove my entry          | ✅   |
| `GET`    | `/api/push`                 | Get VAPID public key     | ✅   |
| `POST`   | `/api/push?action=subscribe`| Save push subscription   | ✅   |
| `POST`   | `/api/push?action=send`     | Send push notification   | ✅   |
| `DELETE` | `/api/push`                 | Unsubscribe              | ✅   |
| `POST`   | `/api/ai`                   | AI study assistant       | ✅   |

---

## 🚀 خطوات الـ Deploy على Vercel

### 1️⃣ ثبّت Vercel CLI
```bash
npm install -g vercel
```

### 2️⃣ سجّل دخول
```bash
vercel login
```

### 3️⃣ احصل على Firebase Service Account
- روح [Firebase Console](https://console.firebase.google.com)
- **Project Settings → Service Accounts → Generate new private key**
- احفظ الـ JSON

### 4️⃣ ولّد VAPID Keys للـ Push
```bash
npx web-push generate-vapid-keys
```

### 5️⃣ أضف Environment Variables في Vercel
```bash
vercel env add FIREBASE_PROJECT_ID
# → gunis-study

vercel env add FIREBASE_CLIENT_EMAIL
# → firebase-adminsdk-xxxxx@gunis-study.iam.gserviceaccount.com

vercel env add FIREBASE_PRIVATE_KEY
# → -----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n

vercel env add ANTHROPIC_API_KEY
# → sk-ant-api03-...

vercel env add VAPID_PUBLIC_KEY
# → (من خطوة 4)

vercel env add VAPID_PRIVATE_KEY
# → (من خطوة 4)

vercel env add VAPID_EMAIL
# → mailto:your@email.com

vercel env add ALLOWED_ORIGIN
# → https://YOUR_USERNAME.github.io
```

### 6️⃣ Deploy!
```bash
vercel --prod
```

✅ الـ API هيبقى على: `https://genius-backend.vercel.app`

---

## 🔐 Authentication

كل الـ endpoints (ما عدا `/api/health`) محتاجة Firebase ID Token:

```javascript
// في الفرونت-إند
const user  = firebase.auth().currentUser;
const token = await user.getIdToken();

const res = await fetch('https://genius-backend.vercel.app/api/sync', {
    method:  'POST',
    headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
});
```

---

## 📡 AI Endpoint

```javascript
// Regular response
POST /api/ai
{
  "type": "analyze",        // analyze | plan | weak | motivate | custom
  "message": "...",         // required for type=custom
  "stats": {
    "sessions":    42,
    "totalHours":  18.5,
    "done":        35,
    "paused":      7,
    "topSubjects": [
      { "name": "الرياضيات", "hours": 6.5 },
      { "name": "الفيزياء",  "hours": 4.0 }
    ]
  },
  "stream": false           // true = Server-Sent Events
}
```

---

## 🔔 Push Notifications

```javascript
// 1. Get VAPID public key
const { publicKey } = await fetch('/api/push').then(r => r.json());

// 2. Subscribe
const sw  = await navigator.serviceWorker.ready;
const sub = await sw.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: publicKey,
});
await fetch('/api/push?action=subscribe', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub }),
});

// 3. Send (from backend or self)
await fetch('/api/push?action=send', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'وقت المذاكرة! 📚', body: 'ابدأ جلستك الآن' }),
});
```

---

## 🛡️ Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /leaderboard/{userId} {
      allow read:  if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /pushSubscriptions/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```
