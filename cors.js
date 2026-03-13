// middleware/cors.js
const ALLOWED = process.env.ALLOWED_ORIGIN || '*';

export function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin',  ALLOWED);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export function handleOptions(req, res) {
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.status(200).end();
        return true;
    }
    return false;
}
