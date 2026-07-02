
export class AudioEngine {
	constructor() {
		this.ctx = new (window.AudioContext || window.webkitAudioContext)();

		this.buffer = null;
		this.source = null;

		this.isPlaying = false;

		this.playbackStartTime = 0;
		this.playbackOffset = 0;
	}

	async load(file) {
		const arrayBuffer = await file.arrayBuffer();

		const buffer = await this.ctx.decodeAudioData(arrayBuffer);

		this.buffer = buffer;
	}

	async play(offset = this.playbackOffset) {

		if (!this.buffer) return;

		await this.ctx.resume();

		this.stop();

		this.source = this.ctx.createBufferSource();
		this.source.buffer = this.buffer;

		this.source.loop = false;

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
	}

	getPlaybackPosition() {

		if (!this.buffer) return 0;

		if (!this.isPlaying) return this.playbackOffset;

		return this.playbackOffset +
			(this.ctx.currentTime - this.playbackStartTime);
	}

	seek(time) {
		if (!this.buffer) return;

		time = Math.max(0, Math.min(time, this.buffer.duration));

		this.playbackOffset = time;

		if (this.isPlaying) {
			this.play(time);
		}
	}

	get duration() {
		return this.buffer?.duration ?? 0;
	}
}