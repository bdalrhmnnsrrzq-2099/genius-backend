// api/push.js — Web Push Notifications
import webpush          from 'web-push';
import { db }           from '../lib/firebase.js';
import { verifyToken }  from '../middleware/auth.js';
import { setCors, handleOptions } from '../middleware/cors.js';

// Configure VAPID
webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    const user = await verifyToken(req, res);
    if (!user) return;

    const subCol = db.collection('pushSubscriptions');

    // ── POST /api/push/subscribe → save subscription ──
    if (req.method === 'POST' && req.url?.includes('subscribe')) {
        const { subscription } = req.body || {};
        if (!subscription?.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }
        try {
            await subCol.doc(user.uid).set({
                uid:          user.uid,
                subscription,
                createdAt:    new Date().toISOString(),
            });
            return res.status(200).json({ ok: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── POST /api/push/send → send push to self ───────
    if (req.method === 'POST' && req.url?.includes('send')) {
        const { title = 'Genius 💡', body = 'تذكير!', tag = 'genius' } = req.body || {};
        try {
            const snap = await subCol.doc(user.uid).get();
            if (!snap.exists) {
                return res.status(404).json({ error: 'No subscription found — subscribe first' });
            }
            const { subscription } = snap.data();
            await webpush.sendNotification(subscription, JSON.stringify({ title, body, tag }));
            return res.status(200).json({ ok: true });
        } catch (e) {
            // Subscription expired → clean up
            if (e.statusCode === 410) {
                await subCol.doc(user.uid).delete();
                return res.status(410).json({ error: 'Subscription expired, please re-subscribe' });
            }
            return res.status(500).json({ error: e.message });
        }
    }

    // ── GET /api/push/vapid-public-key → give frontend the key ──
    if (req.method === 'GET') {
        return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    }

    // ── DELETE /api/push → unsubscribe ────────────────
    if (req.method === 'DELETE') {
        try {
            await subCol.doc(user.uid).delete();
            return res.status(200).json({ ok: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
