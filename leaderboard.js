// api/leaderboard.js — Leaderboard (top 20 by hours)
import { db }           from '../lib/firebase.js';
import { verifyToken }  from '../middleware/auth.js';
import { setCors, handleOptions } from '../middleware/cors.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    const user = await verifyToken(req, res);
    if (!user) return;

    const lbCol = db.collection('leaderboard');

    // ── GET /api/leaderboard → top 20 ─────────────────
    if (req.method === 'GET') {
        try {
            const snap = await lbCol
                .orderBy('hours', 'desc')
                .limit(20)
                .get();

            const entries = [];
            snap.forEach(doc => entries.push({ uid: doc.id, ...doc.data() }));

            // Find caller's rank
            const myRank = entries.findIndex(e => e.uid === user.uid);

            return res.status(200).json({
                ok:      true,
                entries,
                myRank:  myRank === -1 ? null : myRank + 1,
                total:   entries.length,
            });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── POST /api/leaderboard → upsert my score ────────
    if (req.method === 'POST') {
        const { name, photo, hours, lessons } = req.body || {};

        if (typeof hours !== 'number' || hours < 0) {
            return res.status(400).json({ error: 'hours must be a non-negative number' });
        }

        try {
            await lbCol.doc(user.uid).set({
                uid:       user.uid,
                name:      name      || user.name  || 'مجهول',
                photo:     photo     || '',
                hours:     parseFloat(hours.toFixed(2)),
                lessons:   lessons   || 0,
                updatedAt: new Date().toISOString(),
            });

            return res.status(200).json({ ok: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── DELETE /api/leaderboard → remove my entry ──────
    if (req.method === 'DELETE') {
        try {
            await lbCol.doc(user.uid).delete();
            return res.status(200).json({ ok: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
