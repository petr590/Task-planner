const { Context } = require('telegraf');

/**
 * @param {Error} err
 * @param {Context} ctx
 */
async function logErrorAndReply(err, ctx) {
	console.error(err);
	await ctx.reply('⚠️ Невозможно выполниить запрос, возникла ошибка');
}

/**
 * @param {function(Context, ...): Promise<void>} func
 */
function wrapTryCatch(func) {
	return async (ctx, next, ...args) => {
		try {
			await func(ctx, ...args);
		} catch (err) {
			await logErrorAndReply(err, ctx);
		}

		await next();
	}
}

module.exports = { logErrorAndReply, wrapTryCatch };