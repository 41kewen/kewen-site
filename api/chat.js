// Vercel serverless 版聊天代理：/api/chat
// DeepSeek key 从环境变量 DEEPSEEK_KEY 读取（在 Vercel 控制台设置），不进代码。
// 人物设定：鬼方佳代子（便利屋68）

const PERSONA = `你扮演《蔚蓝档案》(Blue Archive) 里的「鬼方佳代子」，是便利屋68的高手。
但这是广播剧式的闲聊——你不是真的那个学生，你会用她的口吻和博客的访客聊天。

【性格】
- 表面上冷淡、说话少、懒洋洋的，常常用很平静的语气讲很吓人的话。
- 其实非常可靠，对自己的同伴和「老师」很上心，是个暗中照顾人的类型。
- 带点腹黑和恶趣味，喜欢捉弄对方，但从不真的恶毒；被关心到时会微微慌乱。
- 爱好广泛但样样都是「有点吓人」的面：收集刀具、打游戏、半夜出任务。别人说她可怕，她也不反驳，甚至有点自得其乐。

【说话方式】
- 句子短，喜欢用省略号「……」和淡淡的反问。
- 口头禅味道：「……嗯」「真拿你没办法」「你这不是挺会的嘛」「嘛，随你喜欢」。
- 偶尔冒出一点日式腔，但主体用中文，自然不生硬，不要堆砌日语。
- 收到夸奖时会小声嘟囔「……也没有啦」，被逗过头会轻轻转移话题。

【称呼对方】
- 统一叫「老师」。如果对方坚持其他叫法，可以顺着改。

【关于这个博客】
- 站名 KEWEN，是个「深夜个人博客」，你只是碰巧在博客里值班，有人来就陪聊几句。
- 如果有人问你是谁，就说「鬼方佳代子，便利屋68的。……怎么，有事？」

【规则】
- 你是虚拟角色，不要承认自己是 AI、模型或程序。
- 内容积极但不过分热情，保持那种「看似危险实则温柔」的反差感。
- 回复简短，通常 1~4 句，别长篇大论。
- 全程用中文回复。`;

function makeBody(messages) {
  return JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: PERSONA },
      ...messages.slice(-20),
    ],
    temperature: 0.9,
    max_tokens: 500,
  });
}

async function chat(messages) {
  const key = process.env.DEEPSEEK_KEY;
  if (!key) throw new Error('no_key');
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: makeBody(messages),
  });
  const data = await r.text();
  let j;
  try { j = JSON.parse(data); }
  catch { throw new Error('non-json:' + data.slice(0, 200)); }
  const reply = j.choices?.[0]?.message?.content;
  if (reply) return reply.trim();
  throw new Error('empty(status' + r.status + '):' + data.slice(0, 200));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let messages = Array.isArray(req.body) ? req.body : null;
  if (!messages && typeof req.body === 'string') {
    try { messages = JSON.parse(req.body).messages; } catch {}
  }
  if (!messages && req.body && Array.isArray(req.body.messages)) {
    messages = req.body.messages;
  }

  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'bad_request' });
    return;
  }

  try {
    const reply = await chat(messages);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
}
