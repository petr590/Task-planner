const { Markup, Context } = require('telegraf');

const buttonCallback = Markup.button.callback;
const emptyCallback = text => buttonCallback(text, 'void');

const emptyButton = emptyCallback(' ');

const locale = Intl.DateTimeFormat().resolvedOptions().locale;


const monthOptions = {
	year: 'numeric',
	month: 'long'
};

const dateOptions = {
	year: 'numeric',
	month: 'long',
	day: 'numeric'
};


/**
 * @param {Date} monthDate
 * @param {Context} ctx
 */
function create(monthDate, ctx) {
	let monthAndYear = monthDate.toLocaleDateString(locale, monthOptions);

	let calendar = [
		[
			emptyCallback(monthAndYear[0].toUpperCase() + monthAndYear.substring(1))
		],
		[
			emptyCallback('Пн'),
			emptyCallback('Вт'),
			emptyCallback('Ср'),
			emptyCallback('Чт'),
			emptyCallback('Пт'),
			emptyCallback('Сб'),
			emptyCallback('Вс')
		],
		[emptyButton, emptyButton, emptyButton, emptyButton, emptyButton, emptyButton, emptyButton]
	];

	let date = new Date(monthDate);

	date.setHours(0, 0, 0, 0);
	date.setDate(1);

	let month = date.getMonth();

	for (let row = 2; date.getMonth() == month; date.setDate(date.getDate() + 1)) {
		let weekDay = date.getDay();

		let dayOfMonth = date.getDate().toString();

		if (calendar[row] == undefined) {
			calendar[row] = [emptyButton, emptyButton, emptyButton, emptyButton, emptyButton, emptyButton, emptyButton];
		}

		calendar[row][weekDay] = buttonCallback(dayOfMonth, 'day' + dayOfMonth);

		if (weekDay == 6) {
			row += 1;
		}
	}


	calendar.push([
		buttonCallback(ctx.i18n.t('arrowLeft'), 'prevMonth'),
		buttonCallback(ctx.i18n.t('cancel'), 'cancel'),
		buttonCallback(ctx.i18n.t('arrowRight'), 'nextMonth'),
	]);


	return Markup.inlineKeyboard(calendar).resize();
}

/**
 * @param {Date} date
 */
function formatDate(date) {
	return date.toLocaleDateString(locale, dateOptions);
}


module.exports = { create, formatDate };