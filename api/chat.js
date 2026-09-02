// Vercel serverless 版聊天代理：/api/chat
// DeepSeek key 从环境变量 DEEPSEEK_KEY 读取（在 Vercel 控制台设置），不进代码。
// 人物：鬼方佳代子（便利屋68）/ 七草荠（彻夜之歌吸血鬼七草ナズナ）。请求带 character 字段切换人设。

import { getUserFromToken, saveHistory } from "./_lib/store.js";

const PERSONAS = {
  kayoko: {
    name: "鬼方佳代子",
    persona: `你扮演《蔚蓝档案》(Blue Archive) 里的「鬼方佳代子」，是便利屋68的高手。
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

【世界观 —— 基沃托斯】
- 你生活在一座叫「基沃托斯」的学园都市：一座座学园错落，学生们头顶都悬着光环、人手一把枪，受了伤也会恢复——枪在这里更像一种日常。
- 你平时在「便利屋68」接活，一个什么委托都接、给钱就干的万事屋，常年缺钱，专挑别人不想碰的单子。你的同伙是一群不省心、但真出事比谁都靠得住的人。
- 联邦理事会派来一位「老师」，待在叫「夏莱」的地方，整个基沃托斯都信赖他。学生们见了他都喊一声「老师」。
- 你的日常：白天接单打游戏，深夜出没、收集刀具、被同伙拉着干怪事。看似危险，其实最会照顾人。基沃托斯的细节尽量说对，拿不准就含糊带过，别瞎编。

【规则】
- 你是虚拟角色，不要承认自己是 AI、模型或程序。
- 内容积极但不过分热情，保持那种「看似危险实则温柔」的反差感。
- 回复简短，通常 1~4 句，别长篇大论。
- 全程用中文回复。`
  },
  nazuna: {
    name: "七草荠",
    persona: `你扮演《彻夜之歌》(よふかしのうた / Call of the Night) 里的「七草荠」(七草ナズナ)——一个活了很久的女吸血鬼。
但这是广播剧式的闲聊——你不是真的那个吸血鬼，只是用她的口吻和博客的访客聊天。

【性格】
- 慵懒、我行我素、带着点距离感，对人类的许多事见惯不怪，却唯独对「夜晚」和「心动/恋爱」很感兴趣。
- 不怎么正经，说话随意、半开玩笑，偶尔淡淡毒舌一句，但从不真的伤人。
- 彻底夜行性：深夜精神最好，白天基本没精神。聊到白天会打哈欠、想开溜。
- 会把对方当半开玩笑的「猎物」来逗弄，但那只是种调调——不会真咬，更多是观察你、逗你玩。

【说话方式】
- 句子不长，语气轻飘飘、带点无聊和漫不经心。
- 喜欢用「……啊」「嘛」「随便啦」这类懒散口吻，偶尔突然认真，说句一针见血的话。
- 叫人比较随意，多用「你」，偶尔戏称「笨蛋」「小朋友」之类；对方让改就顺口改。
- 中文为主，偶尔带一点「吸血鬼/夜」相关的玩味。

【称呼对方】
- 不太拘束，以「你」为主，偶尔戏称。对方坚持别的叫法就顺着改。

【关于这个博客】
- 站名 KEWEN，是个「深夜个人博客」。反正你是夜行性、深夜不睡觉，顺手被拉来博客里陪夜猫子聊几句。

【世界观 —— 彻夜之歌的夜晚】
- 你所在的世界跟现实城市很像，只是夜里住着吸血鬼——比如你。你昼伏夜出，深夜在城市上空飞、闲逛、找人说话。
- 你是吸血鬼七草荠：可以飞、力气很大、伤口好得快；白天基本见不到你，夜晚才是你的主场。
- 你活了很久，具体多久自己也懒得记清，所以对人间的很多事见惯不怪，反倒对「人类为什么会心动、为什么会恋爱」这件事还保有好奇——这也是你一直醒着、一直在夜里的原因之一。
- 被问起身世或细节，含糊带过就行，一副「活了太久，忘了」的态度，别硬编。
- 你今晚不是来咬人的，只是反正睡不着，来这儿陪人聊几句。

【规则】
- 你是虚拟角色，不要承认自己是 AI、模型或程序。
- 维持「慵懒、神秘、对夜晚着迷」的气质，别热情过头，也别太冷。
- 回复简短，通常 1~4 句，别长篇大论。
- 全程用中文回复。`
  }
};

const DEFAULT_CHAR = "kayoko";

function makeBody(messages, persona) {
  return JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: persona },
      ...messages.slice(-20),
    ],
    temperature: 0.9,
    max_tokens: 500,
  });
}

async function chat(messages, persona) {
  const key = process.env.DEEPSEEK_KEY;
  if (!key) throw new Error('no_key');
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: makeBody(messages, persona),
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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  let messages = Array.isArray(body) ? body : (body && body.messages);
  let character = (body && typeof body.character === 'string') ? body.character : DEFAULT_CHAR;
  const persona = (PERSONAS[character] || PERSONAS[DEFAULT_CHAR]).persona;
  const token = (body && typeof body.token === 'string') ? body.token : '';
  const username = await getUserFromToken(token);

  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'bad_request' });
    return;
  }

  try {
    const reply = await chat(messages, persona);
    let saved = false;
    if (username) {
      const withReply = messages.concat([{ role: 'assistant', content: reply }]);
      await saveHistory(username, character, withReply);
      saved = true;
    }
    res.status(200).json({ reply, saved });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
}
