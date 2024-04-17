const { Markup } = require('telegraf');
const { BaseScene } = require('telegraf/scenes');

const scene = new BaseScene('startScene');

scene.enter(async (ctx, next) => {
	await ctx.reply(
		ctx.i18n.t('start'),
		Markup.inlineKeyboard([
			Markup.button.callback(ctx.i18n.t('task.add'), 'addTask'),
			Markup.button.callback(ctx.i18n.t('task.list'), 'taskList')
		])
	);
	
	await next();
});

module.exports = scene;