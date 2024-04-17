const mysql = require('mysql2');
  
const connection = mysql.createConnection({
	host:     process.env.DB_HOST,
	port:     process.env.DB_PORT,
	database: process.env.DB_NAME,
	user:     process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	waitForConnections: true
});

connection.connect(err => {
	if (err != null) {
		console.error('Connection error: ' + err.message);
	} else {
		console.log('Connected successfully');
	}
});

const TASK_TABLE = 'tasks';


async function queryWithPromise(query, values) {
	let resolveCallback, rejectCallback;

	let promise = new Promise((resolve, reject) => {
		resolveCallback = resolve;
		rejectCallback = reject;
	});

	connection.query(query, values,
		(err, result) => {
			if (err != null) {
				rejectCallback(err);
			} else {
				resolveCallback(result);
			}
		}
	);
	
	return promise;
}


class Task {
	/** @type {number} */ id;
	/** @type {number} */ user_id;
	/** @type {string} */ text;
	/** @type {Date} */ date;
	/** @type {number} boolean */ done;
}


module.exports = class TaskTable {
	static #cache = {};

	static #resetCache(user_id) {
		this.#cache[user_id] = null;
	}

	/**
	 * @param {number} user_id
	 * @param {Date|undefined} date
	 * @returns {Promise<Task[]>}
	 */
	static async load(user_id) {
		return  TaskTable.#cache[user_id] ??
				(TaskTable.#cache[user_id] = queryWithPromise(`SELECT * FROM ${TASK_TABLE} WHERE ?`, { user_id }));
	}

	/**
	 * @param {number} user_id
	 * @param {Date} date
	 * @param {string} text
	 */
	static save(user_id, date, text) {
		this.#resetCache(user_id);

		return queryWithPromise(`INSERT INTO ${TASK_TABLE} SET ?`, { user_id, date, text });
	}

	/**
	 * @param {Task} task
	 */
	static update(task) {
		this.#resetCache(task.user_id);

		return queryWithPromise(
			`UPDATE ${TASK_TABLE} SET ? WHERE id=${task.id}`,
			{ text: task.text, date: task.date, done: task.done }
		);
	}


	/**
	 * @param {Task} task
	 */
	static switchDoneFlag(task) {
		this.#resetCache(task.user_id);

		return queryWithPromise(`UPDATE ${TASK_TABLE} SET done=NOT done WHERE id=${task.id}`);
	}

	/**
	 * @param {Task} task
	 */
	static delete(task) {
		this.#resetCache(task.user_id);

		return queryWithPromise(`DELETE FROM ${TASK_TABLE} WHERE id=${task.id}`);
	}
};