const { Context } = require('telegraf');
const { BaseScene } = require('telegraf/scenes');
const TaskTable = require('../database');
const Calendar = require('./calendar');
const { logErrorAndReply } = require('./util');

const scene = new BaseScene('addTaskScene');


scene.enter(async (ctx, next) => {
	let date = new Date();
	ctx.session.monthDate = date;

	ctx.session.chosenDate = null;
	ctx.session.taskText = null;

	ctx.session.calendarMessageId = (
		await ctx.reply(ctx.i18n.t('task.choseDateAndText'), Calendar.create(date, ctx))
	).message_id;

	await next();
})


async function changeMonth(ctx, next, offset) {
	let date = ctx.session.monthDate;
	date.setMonth(date.getMonth() + offset);

	await ctx.telegram.editMessageReplyMarkup(
		ctx.chat.id, ctx.session.calendarMessageId, undefined,
		Calendar.create(date, ctx).reply_markup
	);

	await next();
}


scene.action('prevMonth', (ctx, next) => changeMonth(ctx, next, -1))
scene.action('nextMonth', (ctx, next) => changeMonth(ctx, next, +1))


for (let day = 1; day <= 31; day++) {
	scene.action('day' + day, async (ctx, next) => {
		let date = ctx.session.monthDate;

		date.setDate(day);
		ctx.session.chosenDate = date;

		await ctx.reply('Дата: ' + Calendar.formatDate(date));

		await leaveIfDone(ctx);
		await next();
	});
}


scene.on('text', async (ctx, next) => {
	if (ctx.session.taskText == null) {
		ctx.session.taskText = ctx.message.text;
	}

	await leaveIfDone(ctx);
	await next();
})


scene.action('cancel', async (ctx, next) => {
	ctx.session.chosenDate = null;
	ctx.session.taskText = null;

	await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.calendarMessageId);

	ctx.session.calendarMessageId = null;

	await ctx.scene.leave();
	await next();
})


/**
 * @param {Context} ctx
 */
async function leaveIfDone(ctx) {
	if (ctx.session.chosenDate != null && ctx.session.taskText != null) {
		try {
			await TaskTable.save(ctx.from.id, ctx.session.chosenDate, ctx.session.taskText);
			await ctx.reply(ctx.i18n.t('task.added'));

		} catch (err) {
			logErrorAndReply(err, ctx);
		}

		await ctx.scene.leave();
	}
}


module.exports = scene;