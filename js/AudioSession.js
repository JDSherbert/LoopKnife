

export class AudioSession {
	constructor(engine, loop) {
		this._engine = engine;
		this._loop = loop;
		this.listeners = {};
	}

	async open(file) {
		await this._engine.load(file);

		this._loop.setStart(0);
		this._loop.setEnd(this._engine.duration);

		// store metadata for file
		this.fileInfo = {
			name: file.name,
			type: file.type,
			size: file.size
		};


		console.log("Session loaded");
		this.emit("loaded", {
			buffer: this._engine.buffer,
			fileInfo: this._engine.fileInfo
		});
	}

	get engine() {
		return this._engine;
	}

	get loop() {
		return this._loop;
	}

	on(event, fn) {
		(this.listeners[event] ??= []).push(fn);
	}

	emit(event, data) {
		for (const fn of this.listeners[event] ?? []) {
			fn(data);
		}
	}

}