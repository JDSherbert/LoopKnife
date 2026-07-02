


export class Renderer {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		this.sessionReady = false;

		this.resize();
	}

	resize() {
		const dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();

		this.canvas.width = Math.floor(rect.width * dpr);
		this.canvas.height = Math.floor(rect.height * dpr);

		// Reset the transform before applying a new scale
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.scale(dpr, dpr);

		this.width = rect.width;
		this.height = rect.height;
	}

	attach(session) {
		this.session = session;

		session.on("loaded", () => {
			console.log("Renderer ready");
			this.sessionReady = true;
			// build waveform once, not every frame
			this.setBuffer(session.engine.buffer);
		});
	}

	setZoom(value) {
		this.zoom = Math.max(1, value);
	}

	setBuffer(buffer) {
		this.buffer = buffer;
		this.peaks = this.buildPeaks(buffer, 8192);
	}

	buildPeaks(buffer, resolution = 8192) {
		const data = buffer.getChannelData(0);
		const peaks = [];

		const blockSize = Math.floor(data.length / resolution);

		for (let i = 0; i < resolution; i++) {

			let min = 1;
			let max = -1;

			const start = i * blockSize;
			const end = start + blockSize;

			for (let j = start; j < end; j++) {
				const sample = data[j];
				if (sample < min) min = sample;
				if (sample > max) max = sample;
			}

			peaks.push({ min, max });
		}

		return peaks;
	}

	render() {

		if (!this.sessionReady) {
			this.drawEmptyState();
			return;
		}

		const engine = this.session.engine;
		const loop = this.session.loop;
		const buffer = engine.buffer;

		this.ctx.clearRect(0, 0, this.width, this.height);

		this.drawWaveform();

		this.drawLoop(
			loop.getStart(),
			loop.getEnd(),
			buffer.duration
		);

		this.drawPlayhead(
			engine.getPlaybackPosition(),
			buffer.duration
		);
	}

	drawWaveform() {
		if (!this.peaks) return;

		const width = this.width;
		const height = this.height;

		const step = Math.floor(this.peaks.length / width);

		this.ctx.beginPath();

		for (let x = 0; x < width; x++) {

			let min = 1;
			let max = -1;

			const start = x * step;
			const end = start + step;

			for (let i = start; i < end; i++) {
				const p = this.peaks[i];
				if (!p) continue;

				if (p.min < min) min = p.min;
				if (p.max > max) max = p.max;
			}

			const y1 = (1 + min) * 0.5 * height;
			const y2 = (1 + max) * 0.5 * height;

			this.ctx.moveTo(x, y1);
			this.ctx.lineTo(x, y2);
		}

		this.ctx.strokeStyle = "#00ffcc";
		this.ctx.stroke();
	}

	drawPlayhead(time, duration) {

		if (!duration) return;
		const x = (time / duration) * this.width;

		this.ctx.strokeStyle = "#ff6600";
		this.ctx.beginPath();
		this.ctx.moveTo(x, 0);
		this.ctx.lineTo(x, this.height);
		this.ctx.stroke();
	}

	drawLoop(loopStart, loopEnd, duration) {

		if (!duration) return;
		const width = this.width;
		const height = this.height;

		const x1 = loopStart / duration * width;
		const x2 = loopEnd / duration * width;

		// region fill
		this.ctx.fillStyle = "rgba(0, 255, 200, 0.15)";
		this.ctx.fillRect(x1, 0, x2 - x1, height);

		// start handle
		this.ctx.strokeStyle = "#ff3b3b";
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(x1, 0);
		this.ctx.lineTo(x1, height);
		this.ctx.stroke();

		// end handle
		this.ctx.beginPath();
		this.ctx.moveTo(x2, 0);
		this.ctx.lineTo(x2, height);
		this.ctx.stroke();

		this.ctx.lineWidth = 1;
	}

	drawEmptyState() {
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.ctx.fillStyle = "#666";
		this.ctx.fillText("Load audio...", 20, 20);
	}
}