// middleware/auth.js — verify Firebase ID token
import { auth } from '../lib/firebase.js';

/**
 * Extracts and verifies the Bearer token from Authorization header.
 * Returns { uid, email, name } or throws 401.
 */
export async function verifyToken(req, res) {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: 'Missing Authorization header' });
        return null;
    }

    try {
        const decoded = await auth.verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email, name: decoded.name };
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired token', detail: e.message });
        return null;
    }
}
