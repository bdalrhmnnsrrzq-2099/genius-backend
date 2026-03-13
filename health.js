// api/health.js — health check
import { setCors } from '../middleware/cors.js';

export default function handler(req, res) {
    setCors(res);
    res.status(200).json({
        ok:        true,
        service:   'Genius Backend API',
        version:   '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            'GET  /api/health':                  'this endpoint',
            'GET  /api/auth':                    'verify token → user profile',
            'GET  /api/sync':                    'pull user data',
            'POST /api/sync':                    'push user data',
            'DELETE /api/sync':                  'delete user data',
            'GET  /api/leaderboard':             'top 20 players',
            'POST /api/leaderboard':             'upsert my score',
            'DELETE /api/leaderboard':           'remove my entry',
            'GET  /api/push':                    'get VAPID public key',
            'POST /api/push?action=subscribe':   'save push subscription',
            'POST /api/push?action=send':        'send push notification',
            'DELETE /api/push':                  'unsubscribe',
            'POST /api/ai':                      'AI study assistant (stream or regular)',
        },
    });
}
