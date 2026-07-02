


export class AudioEngine {
	constructor() {
		this.ctx = new (window.AudioContext || window.webkitAudioContext)();

		this.buffer = null;
		this.source = null;

		this.isPlaying = false;

		this.playbackStartTime = 0;
		this.playbackOffset = 0;

		this.loopRegion = null;
		this.looping = false;
		this.originalFile = null;
		this.originalBytes = null;
	}

	async load(file) {

		this.originalFile = file;
		this.originalBytes = await file.arrayBuffer();

		// Get a seperate copy of the buffer as some browsers will consume the 
		// original buffer when playing it, which will break the export functionality.
		const arrayBuffer = await file.arrayBuffer();
		const buffer = await this.ctx.decodeAudioData(arrayBuffer);

		this.buffer = buffer;
	}

	async play(offset = this.playbackOffset, loopRegion = null) {

		if (!this.buffer) return;

		await this.ctx.resume();

		this.stop();

		this.source = this.ctx.createBufferSource();
		this.source.buffer = this.buffer;

		const hasValidLoop = loopRegion && loopRegion.getEnd() > loopRegion.getStart();

		if (hasValidLoop) {
			this.source.loop = true;
			this.source.loopStart = loopRegion.getStart();
			this.source.loopEnd = loopRegion.getEnd();
		} else {
			this.source.loop = false;
		}

		this.loopRegion = hasValidLoop ? loopRegion : null;
		this.looping = hasValidLoop;

		this.source.connect(this.ctx.destination);

		this.playbackStartTime = this.ctx.currentTime;
		this.playbackOffset = offset;

		this.source.start(0, offset);

		this.isPlaying = true;
	}

	pause() {

		if (!this.isPlaying) return;

		const pos = this.getPlaybackPosition();

		this.stop();

		this.playbackOffset = pos;
	}

	stop() {

		if (this.source) {
			try { this.source.stop(); } catch { }
			this.source.disconnect();
		}

		this.source = null;
		this.isPlaying = false;
		this.playbackOffset = 0;
		this.loopRegion = null;
		this.looping = false;
	}

	getPlaybackPosition() {

		if (!this.buffer) return 0;

		if (!this.isPlaying) return this.playbackOffset;

		const raw = this.playbackOffset +
			(this.ctx.currentTime - this.playbackStartTime);

		if (this.looping && this.loopRegion) {
			const loopStart = this.loopRegion.getStart();
			const loopEnd = this.loopRegion.getEnd();
			const loopLength = loopEnd - loopStart;

			if (raw >= loopEnd && loopLength > 0) {
				return loopStart + ((raw - loopStart) % loopLength);
			}
		}

		return raw;
	}

	seek(time) {
		if (!this.buffer) return;

		time = Math.max(0, Math.min(time, this.buffer.duration));

		this.playbackOffset = time;

		if (this.isPlaying) {
			this.play(time, this.loopRegion);
		}
	}

	get duration() {
		return this.buffer?.duration ?? 0;
	}
}