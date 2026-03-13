// api/ai.js — AI Study Assistant (Claude via Anthropic API)
import Anthropic        from '@anthropic-ai/sdk';
import { verifyToken }  from '../middleware/auth.js';
import { setCors, handleOptions } from '../middleware/cors.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `أنت مساعد مذاكرة ذكي اسمه "Genius AI" — بتساعد الطلاب العرب على تحسين مستواهم الدراسي.
ردودك دايماً بالعربي، واضحة ومحفّزة وعملية.
لما تحلل بيانات الطالب، ركّز على:
- نقاط القوة والضعف
- توزيع الوقت على المواد
- اقتراح جداول مذاكرة واقعية
- التحفيز والمتابعة
اردود بشكل منظم باستخدام نقاط وعناوين لما يناسب.`;

// Prompt templates
function buildPrompt(type, stats) {
    const { sessions = [], subjects = [], done = [], paused = [], totalHours = 0, topSubjects = [] } = stats;

    const base = `
بيانات الطالب:
- إجمالي الجلسات: ${sessions}
- إجمالي ساعات المذاكرة: ${totalHours} ساعة
- دروس مكتملة: ${done}
- دروس متوقفة: ${paused}
- أكتر المواد مذاكرة: ${topSubjects.map(s => `${s.name} (${s.hours}س)`).join('، ')}
`;

    switch (type) {
        case 'analyze':
            return base + '\nحلّل أداء الطالب بالتفصيل — نقاط القوة والضعف والاتجاهات.';
        case 'plan':
            return base + '\nاقترح جدول مذاكرة أسبوعي مناسب لهذا الطالب مع توزيع الوقت على المواد.';
        case 'weak':
            return base + '\nحدّد نقاط الضعف والمواد اللي تحتاج اهتمام أكبر واقترح كيفية تحسينها.';
        case 'motivate':
            return base + '\nاكتب رسالة تحفيزية شخصية لهذا الطالب بناءً على بياناته.';
        default:
            return base;
    }
}

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    // Auth check
    const user = await verifyToken(req, res);
    if (!user) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type = 'custom', message = '', stats = {}, stream = false } = req.body || {};

    if (type === 'custom' && !message.trim()) {
        return res.status(400).json({ error: 'message is required for custom type' });
    }

    const userContent = type === 'custom'
        ? `${buildPrompt('', stats)}\n\nسؤال الطالب: ${message}`
        : buildPrompt(type, stats);

    // ── Streaming response ─────────────────────────────
    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const streamRes = await client.messages.stream({
                model:      'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system:     SYSTEM_PROMPT,
                messages:   [{ role: 'user', content: userContent }],
            });

            for await (const chunk of streamRes) {
                if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                    res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
                }
            }
            res.write('data: [DONE]\n\n');
            res.end();
        } catch (e) {
            res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
            res.end();
        }
        return;
    }

    // ── Regular response ──────────────────────────────
    try {
        const response = await client.messages.create({
            model:      'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system:     SYSTEM_PROMPT,
            messages:   [{ role: 'user', content: userContent }],
        });

        const text = response.content.find(b => b.type === 'text')?.text || '';
        return res.status(200).json({ ok: true, text });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
