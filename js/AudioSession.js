/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class AudioSession {
	constructor(engine, loop) {
		this._engine = engine;
		this._loop = loop;
		this.listeners = {};
	}

	async open(file) {
		// Capture the loop markers unpacked from the file metadata bytes
		const loopData = await this._engine.load(file);
		const sampleRate = this._engine.buffer.sampleRate;

		// Convert sample counts into precision playback timeline seconds
		const startTimeInSeconds = loopData.startSamples / sampleRate;
		const endTimeInSeconds = loopData.endSamples / sampleRate;

		// Set the state; If no tags were found, this defaults to 0 and full duration anyway.
		this._loop.setStart(startTimeInSeconds);
		this._loop.setEnd(endTimeInSeconds);

		// store metadata for file
		this.fileInfo = {
			name: file.name,
			type: file.type || "audio/ogg", // Fallback text formatting block for blank ogg types
			size: file.size,
		};

		console.log("Session loaded with markers at seconds:", startTimeInSeconds, "to", endTimeInSeconds);

		this.emit("loaded", {
			buffer: this._engine.buffer,
			fileInfo: this.fileInfo // Passed this.fileInfo directly to ensure consistency
		});
	}

	clearLoopMarkers() {
		this._loop.setStart(0);
		this._loop.setEnd(this._engine.buffer.length / this._engine.buffer.sampleRate);
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