// api/sync.js — Cloud Sync (push & pull user data)
import { db }           from '../lib/firebase.js';
import { verifyToken }  from '../middleware/auth.js';
import { setCors, handleOptions } from '../middleware/cors.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    const user = await verifyToken(req, res);
    if (!user) return;

    const docRef = db.collection('users').doc(user.uid);

    // ── GET /api/sync → pull data ──────────────────────
    if (req.method === 'GET') {
        try {
            const snap = await docRef.get();
            if (!snap.exists) {
                return res.status(404).json({ error: 'No data found for this user' });
            }
            return res.status(200).json({ ok: true, data: snap.data() });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── POST /api/sync → push data ─────────────────────
    if (req.method === 'POST') {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Body must be a JSON object' });
        }

        // Validate required keys
        const allowed = [
            'subjects','sessions','goals','habits','kanban',
            'notes','done','paused','skipped','scheduled',
            'reminders','studyDays','schedule','theme'
        ];
        const payload = {};
        allowed.forEach(k => { if (body[k] !== undefined) payload[k] = body[k]; });
        payload.updatedAt = new Date().toISOString();
        payload.uid       = user.uid;

        try {
            await docRef.set(payload, { merge: true });
            return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── DELETE /api/sync → wipe user data ──────────────
    if (req.method === 'DELETE') {
        try {
            await docRef.delete();
            return res.status(200).json({ ok: true, message: 'User data deleted' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
