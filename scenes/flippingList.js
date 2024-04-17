const { Markup, Context } = require('telegraf');
const { BaseScene } = require('telegraf/scenes');

/**
 * @param {string} id
 */
function getPrevActionId(id) {
	return 'flipPrev' + id[0].toUpperCase() + id.substring(1);
}

/**
 * @param {string} id
 */
function getNextActionId(id) {
	return 'flipNext' + id[0].toUpperCase() + id.substring(1);
}

/**
 * @param {string} id
 */
function getDoneActionId(id) {
	return 'done' + id[0].toUpperCase() + id.substring(1);
}

class FlippingList {
	#ctx;
	#id;
	#objects;
	#objectsGetter;
	#maxLen;
	#index = 0;

	#messageText;
	#messageId;
	#textsCreator;
	#actionIdsCreator;
	
	/**
	 * @param {Context} ctx
	 * @param {BaseScene} scene
	 * @param {string} id
	 * @param {function(): Promise<any[]>} objectsGetter
	 * @param {number} maxLen
	 * @param {string} messageText
	 * @param {function(any): string[]} textsCreator
	 * @param {function(any): string[]} actionIdsCreator
	 * @param {(function(Context, function(): Promise<void>, any, FlippingList): Promise<void>)[]} callbacks
	 * @param {function(Context, function(): Promise<void>): Promise<void>} leaveCallback
	 */
	constructor(ctx, scene, id, objectsGetter, maxLen, messageText,
				textsCreator, actionIdsCreator, callbacks, leaveCallback) {
		
		this.#ctx = ctx;
		this.#id = id;
		this.#objects = objectsGetter();
		this.#objectsGetter = objectsGetter;
		this.#maxLen = maxLen;

		this.#messageText = messageText;
		this.#textsCreator = textsCreator;
		this.#actionIdsCreator = actionIdsCreator;

		scene.action(getDoneActionId(id), leaveCallback);

		this.#objects.then(objects => {
			for (let obj of objects) {
				let actionIds = actionIdsCreator(obj);
	
				for (let i = 0; i < actionIds.length; i++) {

					scene.action(actionIds[i], async (ctx, next) => {
						if (this.#messageId != null) {
							await callbacks[i](ctx, next, obj, this);
						} else {
							await next();
						}
					});
				}
			}
		})
	}


	async #createList() {
		const index = this.#index;
		const maxLen = this.#maxLen;
		const objects = this.#objects = await this.#objectsGetter();

		let keyboard = objects.slice(index, index + maxLen)
				.map(obj => {
					let texts = this.#textsCreator(obj);
					let actions = this.#actionIdsCreator(obj);

					let buttons = [];

					for (let i = 0, len = Math.min(texts.length, actions.length); i < len; i++) {
						buttons.push(Markup.button.callback(texts[i], actions[i]));
					}

					return buttons;
				})
	

		if (index > 0 || index < objects.length - maxLen) {
			let prevButton = index <= 0 ?
					Markup.button.callback(' ', 'void') :
					Markup.button.callback(this.#ctx.i18n.t('arrowUp'), getPrevActionId(this.#id));
			
			let nextButton = index >= objects.length - maxLen ?
					Markup.button.callback(' ', 'void') :
					Markup.button.callback(this.#ctx.i18n.t('arrowDown'), getNextActionId(this.#id));
		
					
			keyboard = [[prevButton], ...keyboard, [nextButton]];
		}

		keyboard.push([
			Markup.button.callback(this.#ctx.i18n.t('done'), getDoneActionId(this.#id))
		]);
	
		return Markup.inlineKeyboard(keyboard).resize();
	}


	async reply() {
		this.#messageId = (await this.#ctx.reply(this.#messageText, await this.#createList())).message_id;
	}

	/**
	 * @param {number|undefined} offset
	 */
	async updateMessage(offset) {
		const newObjects = await this.#objectsGetter();

		const newIndex = Math.max(0,
			Math.min(newObjects.length - this.#maxLen, this.#index + (offset ?? 0)));
	
		if (newObjects != this.#objects || newIndex != this.#index) {
			this.#objects = newObjects;
			this.#index = newIndex;
	
			await this.#ctx.telegram.editMessageReplyMarkup(
				this.#ctx.chat.id, this.#messageId, undefined, (await this.#createList()).reply_markup
			);
		}
	}

	async deleteMessage() {
		if (this.#messageId != null) {
			await this.#ctx.deleteMessage(this.#messageId);
			this.#messageId = null;
		}
	}

	async prevPage() {
		this.updateList(-this.#maxLen);
	}

	async nextPage() {
		this.updateList(this.#maxLen);
	}
}

class FlippingListFabric {
	#id;
	#sessionKey;
	#maxLen;

	/**
	 * @param {BaseScene} scene
	 * @param {string} id
	 * @param {string} sessionKey
	 * @param {number} maxLen
	 */
	constructor(scene, id, sessionKey, maxLen) {
		this.#id = id;
		this.#sessionKey = sessionKey;
		this.#maxLen = maxLen;

		scene.action(getPrevActionId(id), async (ctx, next) => {
			await ctx.session[sessionKey].changePage(-maxLen);
			await next();
		});

		scene.action(getNextActionId(id), async (ctx, next) => {
			await ctx.session[sessionKey].changePage(maxLen);
			await next();
		});
	}

	/**
	 * @param {Context} ctx
	 * @param {BaseScene} scene
	 * @param {function(): Promise<any[]>} objectsGetter
	 * @param {string} messageText
	 * @param {function(any): string[]} textsCreator
	 * @param {function(any): string[]} actionIdsCreator
	 * @param {(function(Context, function(): Promise<void>, any): Promise<void>)[]} callbacks
	 * @param {function(Context, function(): Promise<void>): Promise<void>} leaveCallback
	 */
	async replyWithList(ctx, scene, objectsGetter, messageText,
				textsCreator, actionIdsCreator, callbacks, leaveCallback) {
		
		const array = ctx.session[this.#sessionKey] ??= [];

		const flippingList = new FlippingList(
			ctx, scene, this.#id, objectsGetter, this.#maxLen, messageText,
			textsCreator, actionIdsCreator, callbacks, leaveCallback
		);

		array.push(flippingList);

		await flippingList.reply();
	}

	async deleteList(ctx) {
		const array = ctx.session[this.#sessionKey];

		if (array != null) {
			for (let list of array) {
				await list.deleteMessage();
			}

			ctx.session[this.#sessionKey] = null;
		}
	}
}

module.exports = { FlippingList, FlippingListFabric };