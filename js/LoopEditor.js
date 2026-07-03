/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class LoopEditor {
	constructor(canvas, session, renderer) {
		this.canvas = canvas;
		this.session = session;
		this.renderer = renderer;

		this.dragging = null;
		this.dragOffset = 0;
		this.handleRadius = 10;

		this.bind();
	}

	bind() {
		this.canvas.addEventListener("mousedown", e => {
			this.onDown(e);
		});

		window.addEventListener("mousemove", e => {
			this.onMove(e);
		});

		window.addEventListener("mouseup", () => {
			this.onUp();
		});
	}

	getMouseX(e) {
		const rect = this.canvas.getBoundingClientRect();
		return e.clientX - rect.left;
	}

	timeToX(time) {
		const rect = this.canvas.getBoundingClientRect();
		const engine = this.session.engine;

		return (time / engine.duration) * rect.width;
	}

	xToTime(x) {
		const rect = this.canvas.getBoundingClientRect();
		const engine = this.session.engine;

		return (x / rect.width) * engine.duration;
	}

	// returns "start", "end", "move", or null; does not mutate state
	hitTest(time) {
		const engine = this.session.engine;
		const loop = this.session.loop;
		const rect = this.canvas.getBoundingClientRect();

		const start = loop.getStart();
		const end = loop.getEnd();

		const handleTimeRadius = (this.handleRadius / rect.width) * engine.duration;

		if (Math.abs(time - start) < handleTimeRadius) return "start";
		if (Math.abs(time - end) < handleTimeRadius) return "end";
		if (time > start && time < end) return "move";

		return null;
	}

	onDown(e) {
		const engine = this.session.engine;

		if (!engine.buffer)
			return;

		const x = this.getMouseX(e);
		const time = this.xToTime(x);

		const hit = this.hitTest(time);

		if (hit === "start" || hit === "end") {
			this.dragging = hit;
			return;
		}

		if (hit === "move") {
			this.dragging = "move";
			this.dragOffset = time - this.session.loop.getStart();
			return;
		}
	}

	onMove(e) {
		const engine = this.session.engine;
		const loop = this.session.loop;

		if (!engine.buffer)
			return;

		// update hover cursor
		if (!this.dragging) {
			const x = this.getMouseX(e);
			const time = this.xToTime(x);
			const hit = this.hitTest(time);

			if (hit === "start" || hit === "end") {
				this.canvas.style.cursor = "ew-resize";
			} else if (hit === "move") {
				this.canvas.style.cursor = "grab";
			} else {
				this.canvas.style.cursor = "default";
			}
			return;
		}

		const x = this.getMouseX(e);
		const duration = engine.duration;

		// convert mouse position to time
		let time = this.xToTime(x);

		// clamp
		time = Math.max(0, Math.min(time, duration));

		const minGap = 0.001; // seconds, prevents start/end collapsing to a zero-length loop

		// HANDLE START
		if (this.dragging === "start") {
			const end = loop.getEnd();
			time = Math.min(time, end - minGap);
			loop.setStart(Math.max(0, time));
			this.canvas.style.cursor = "ew-resize";
			return;
		}

		// HANDLE END
		if (this.dragging === "end") {
			const start = loop.getStart();
			time = Math.max(time, start + minGap);
			loop.setEnd(Math.min(duration, time));
			this.canvas.style.cursor = "ew-resize";
			return;
		}

		// Move whole loop to keep the same point under the cursor throughout the drag
		if (this.dragging === "move") {
			const length = loop.getEnd() - loop.getStart();

			// both in TIME units now; no pixel/time mixing
			let newStartTime = time - this.dragOffset;
			let newEndTime = newStartTime + length;

			// clamp to bounds
			if (newStartTime < 0) {
				newStartTime = 0;
				newEndTime = length;
			}

			if (newEndTime > duration) {
				newEndTime = duration;
				newStartTime = duration - length;
			}

			loop.setStart(newStartTime);
			loop.setEnd(newEndTime);
			this.canvas.style.cursor = "grabbing";
		}
	}

	onUp() {
		this.dragging = null;
	}
}