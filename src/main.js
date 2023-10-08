import {session, Telegraf} from 'telegraf';
import {message} from 'telegraf/filters';
import {code} from 'telegraf/format';
import config from 'config';
import {ogg} from './ogg.js';
import {openai} from './openai.js';
import {getUserId} from './utils.js';

console.log('####: test env = ', config.get('TEST_ENV'));

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

const INITIAL_SESSION = {
  messages: [],
};
const THX_WORD = /(Пнл|пнл|Спасибо|спасибо|СПС|спс|Сяп|сяп|Thx|thx|Thanks|thanks)$/gi;

bot.use(session({defaultSession: () => INITIAL_SESSION}));

bot.command('new', async (ctx) => {
  try {
    ctx.session = INITIAL_SESSION;

    await ctx.reply(code('Жду вашего голосового или текстового сообщения...'));
  } catch (e) {
    console.log('Error while command new ', e.message);
    await ctx.reply(code(e.message));
  }
});


bot.command('start', async (ctx) => {
  try {
    ctx.session = INITIAL_SESSION;
    await ctx.reply(code('Жду вашего голосового или текстового сообщения...'));
  } catch (e) {
    console.log('Error while command start ', e.message);
    await ctx.reply(code(e.message));
  }
});

bot.on(message('voice'), async (ctx) => {
  console.log(`Start Voice Message for user id ${getUserId(ctx)}`);

  ctx.session ??= INITIAL_SESSION;

  try {
    await ctx.reply(code('Сообщение принял... Обрабатываю...'));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const content = await openai.transcription(mp3Path);
    await ctx.reply(code(`Ваш запрос: ${content}`));
    ctx.session.messages.push({
      role: openai.roles.USER,
      content,
    });
    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push(response);

    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voices message', e.message);
    await ctx.reply(code(e.message));
  }
});

bot.on(message('text'), async (ctx) => {
  console.log(`Start Text Message for user id ${getUserId(ctx)}`);

  if (ctx.message.text.match(THX_WORD)) {
    ctx.session = INITIAL_SESSION;
    await ctx.reply(code('Хорошо поговорили, захочешь еще приходи. Буду ждать вашего голосового или текстового сообщения...'));
    return;
  }

  ctx.session ??= INITIAL_SESSION;

  try {
    await ctx.reply(code('Сообщение принял... Обрабатываю...'));

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: ctx.message.text,
    });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push(response);

    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voices message', e.message);
    await ctx.reply(code(e.message));
  }
});


bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
