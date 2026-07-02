

export class LoopEditor {
	constructor(canvas, loop, engine, renderer) {
		this.canvas = canvas;
		this.loop = loop;
		this.engine = engine;
		this.renderer = renderer;

		this.dragging = null;

		this.bind();
	}

	bind() {
		this.canvas.addEventListener("mousedown", this.onDown.bind(this));
		window.addEventListener("mousemove", this.onMove.bind(this));
		window.addEventListener("mouseup", this.onUp.bind(this));
	}

	onDown(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;

		const { x1, x2 } = this.renderer.getLoopHandles(
			this.loop.getStart(),
			this.loop.getEnd(),
			this.engine.buffer.duration
		);

		const threshold = 10;

		if (Math.abs(x - x1) < threshold) {
			this.dragging = "start";
		} else if (Math.abs(x - x2) < threshold) {
			this.dragging = "end";
		}
	}

	onMove(e) {
		if (!this.dragging || !this.engine.buffer) return;

		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;

		const time =
			(x / this.renderer.width) * this.engine.buffer.duration;

		if (this.dragging === "start") {
			this.loop.setStart(time);
		}

		if (this.dragging === "end") {
			this.loop.setEnd(time);
		}
	}

	onUp() {
		this.dragging = null;
	}
}