require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { Stage } = require('telegraf/scenes');
const TelegrafI18n = require('telegraf-i18n');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

const i18n = new TelegrafI18n({
	defaultLanguage: 'en',
	allowMissing: true,
	defaultLanguageOnMissing: true,
	useSession: true,
	directory: path.resolve(__dirname, 'locales')
});

const stage = new Stage([
	require('./scenes/startScene'),
	require('./scenes/addTaskScene'),
	require('./scenes/taskListScene'),
]);


bot.use(session());
bot.use(i18n.middleware());
bot.use(stage.middleware());

async function startScene(ctx, next) {
	await ctx.scene.enter('startScene');
	await next();
}


async function addTask(ctx, next) {
	await ctx.scene.enter('addTaskScene');
	await next();
}

async function taskList(ctx, next) {
	await ctx.scene.enter('taskListScene');
	await next();
}

bot.start(startScene);
bot.help(startScene);

bot.action('addTask', addTask);
bot.action('taskList', taskList);

bot.command('addtask', addTask);
bot.command('tasklist', taskList);

bot.launch();