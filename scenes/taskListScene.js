const { Markup } = require('telegraf');
const { BaseScene } = require('telegraf/scenes');
const { FlippingListFabric } = require('./flippingList');
const { wrapTryCatch } = require('./util');
const Calendar = require('./calendar');
const TaskTable = require('../database');

const scene = new BaseScene('taskListScene');

const dateListFabric = new FlippingListFabric(scene, 'date', 'dateList', 10);
const taskListFabric = new FlippingListFabric(scene, 'task', 'taskList', 10);


scene.enter(wrapTryCatch(async ctx => {
	let tasks = await TaskTable.load(ctx.from.id);

	if (tasks.length == 0) {
		await ctx.reply(
			ctx.i18n.t('task.notFound'),
			Markup.inlineKeyboard([
				Markup.button.callback(ctx.i18n.t('task.add'), 'addTask')
			])
		);
		
		return;
	}

	
	dateListFabric.replyWithList(
		ctx, scene,
		
		async () => {
			return [...new Set((await TaskTable.load(ctx.from.id)).map(task => task.date.getTime()))]
						.sort().map(time => new Date(time))
		},

		ctx.i18n.t('task.chooseDate'),

		date => [Calendar.formatDate(date)],
		date => ['chooseDate' + date.getTime()],

		[async (ctx, next, date) => {
			await taskListFabric.replyWithList(
				ctx, scene,

				async () => (await TaskTable.load(ctx.from.id)).filter(task => task.date.getTime() == date.getTime()),

				ctx.i18n.t('task.forDate', { date: Calendar.formatDate(date) }),

				task => [
					task.text,
					ctx.i18n.t(task.done ? 'task.done' : 'task.notDone'),
					ctx.i18n.t('task.delete'),
				],

				task => [
					'editTextOfTask' + task.id,
					'switchDoneFlagForTask' + task.id,
					'deleteTask' + task.id,
				],

				[
					wrapTryCatch(async (ctx, task, list) => {
						ctx.session.editableTask = task;
						ctx.session.editableTaskList = list;
						await ctx.reply(ctx.i18n.t('task.editText'));
					}),

					wrapTryCatch(async (_, task, list) => {
						await TaskTable.switchDoneFlag(task);
						await list.updateMessage();
					}),
					
					wrapTryCatch(async (_, task, list) => {
						await TaskTable.delete(task);
						await list.updateMessage();
					})
				],

				leave
			);

			await next();
		}],

		leave
	);

	async function leave(ctx, next) {
		await taskListFabric.deleteList(ctx);
		await dateListFabric.deleteList(ctx);
		await ctx.scene.leave();
		await next();
	}

	// for (let task of tasks) {

	// }
}));


scene.on('text', async (ctx, next) => {
	const task = ctx.session.editableTask;

	if (task != null) {
		const newText = ctx.message.text;

		if (newText != task.text) {
			task.text = newText;
			await TaskTable.update(task);
			await ctx.session.editableTaskList.updateMessage();
			await ctx.reply(ctx.i18n.t('task.saved'));
		}
	}

	await next();
})


module.exports = scene;