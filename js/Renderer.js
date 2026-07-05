/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class Renderer {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		this.sessionReady = false;

		// Auto scale this to viewport
		this.resize();
		// When window resized, resize canvas and redraw
		window.addEventListener('resize', this.resize.bind(this));
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

		this.resizeCanvasToDisplaySize();
	}

	resizeCanvasToDisplaySize() {
		const canvas = this.ctx.canvas;

		// Get the actual width/height the canvas is taking up in the layout
		const displayWidth = canvas.clientWidth;
		const displayHeight = canvas.clientHeight;

		// If internal pixels don't match layout pixels, sync them up!
		if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
			canvas.width = displayWidth;
			canvas.height = displayHeight;

			// Update any internal references your app relies on
			this.width = displayWidth;
			this.height = displayHeight;

			return true; // Size updated!
		}
		return false; // No changes needed
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

		this.drawGrid(this.ctx, this.width, this.height);

		this.drawWaveform();

		this.drawLoopMarkers(
			loop.getStart(),
			loop.getEnd(),
			buffer.duration
		);

		this.drawPlayhead(
			engine.getPlaybackPosition(),
			buffer.duration
		);
	}

	drawGrid(ctx, width, height) {
		const gridSizeX = 20; // Spacing between individual cells
		const gridSizeY = 50;

		// Style configurations
		const minorColor = "rgba(255, 255, 255, 0.04)";
		const majorColor = "rgba(255, 255, 255, 0.15)";
		const minorWidth = 1;
		const majorWidth = 2;

		// Draw Vertical Lines (Time Markers)
		let vLineIndex = 0;
		for (let x = 0; x < width; x += gridSizeX) {
			ctx.beginPath();

			// Every 10th line becomes a major accent milestone
			if (vLineIndex % 10 === 0) {
				ctx.strokeStyle = majorColor;
				ctx.lineWidth = majorWidth;
			} else {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = minorWidth;
			}

			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();

			vLineIndex++;
		}

		// Draw Horizontal Lines (Amplitude Markers)
		let hLineIndex = 0;
		for (let y = 0; y < height; y += gridSizeY) {
			ctx.beginPath();

			if (hLineIndex % 10 === 0) {
				ctx.strokeStyle = majorColor;
				ctx.lineWidth = majorWidth;
			} else {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = minorWidth;
			}

			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();

			hLineIndex++;
		}

		const midY = height / 2;

		ctx.beginPath();
		ctx.strokeStyle = "rgba(255, 72, 0, 0.4)";
		ctx.lineWidth = 2; // Slightly thicker

		// If using anti-aliasing optimization, snap to pixel grid:
		// Math.floor(height / 2) + 0.5;
		ctx.moveTo(0, midY);
		ctx.lineTo(width, midY);
		ctx.stroke();
	}

	drawWaveform() {
    if (!this.peaks) return;

    const width = this.width;
    const height = this.height;

    // Keep the exact fractional step size.
    const step = this.peaks.length / width;

    this.ctx.beginPath();

    for (let x = 0; x < width; x++) {
        let min = 1;
        let max = -1;

        // Calculate exact boundaries for this pixel column
        const start = Math.floor(x * step);
        const end = Math.floor((x + 1) * step);

        // Scan the real block width
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

	drawLoopMarkers(loopStart, loopEnd, duration) {
		if (!duration) return;
		const width = this.width;
		const height = this.height;

		const x1 = loopStart / duration * width;
		const x2 = loopEnd / duration * width;

		// Region Fill
		this.ctx.fillStyle = "rgba(0, 255, 200, 0.15)";
		this.ctx.fillRect(x1, 0, x2 - x1, height);

		let startColor = "#ffcc00";
		let endColor = "#ff3b3b";

		// Start Handle Line
		this.ctx.strokeStyle = startColor;
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(x1, 0);
		this.ctx.lineTo(x1, height);
		this.ctx.stroke();

		// End Handle Line
		this.ctx.strokeStyle = endColor;
		this.ctx.beginPath();
		this.ctx.moveTo(x2, 0);
		this.ctx.lineTo(x2, height);
		this.ctx.stroke();

		// Accessibility Text Badges Layout
		this.ctx.lineWidth = 1;

		// Configure crisp text properties
		this.ctx.font = "bold 10px sans-serif";
		this.ctx.textBaseline = "top";

		// Draw START abd END Label Badge
		this.drawLabelBadge(x1, "START", startColor, "left");
		this.drawLabelBadge(x2, "END", endColor, "right");
	}

	drawLabelBadge(x, text, accentColor, alignment) {
		const paddingX = 6;
		const paddingY = 4;
		const topMargin = 8; // Distance from the absolute top of the canvas

		const textWidth = this.ctx.measureText(text).width;
		const badgeWidth = textWidth + (paddingX * 2);
		const badgeHeight = 10 + (paddingY * 2);

		// Calculate position based on alignment anchor so text doesn't bleed outside the bounding region
		let badgeX = alignment === "left" ? x + 4 : x - badgeWidth - 4;
		let badgeY = topMargin;

		// Safety check: keep badges from getting pushed off the left or right edges of the canvas screen
		if (badgeX < 0) badgeX = 4;
		if (badgeX + badgeWidth > this.width) badgeX = this.width - badgeWidth - 4;

		// Draw Background Capsule Shield
		this.ctx.fillStyle = "#11141a";
		this.ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

		// Draw Subtle Accent Border matching the parent handle line
		this.ctx.strokeStyle = accentColor;
		this.ctx.lineWidth = 1;
		this.ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

		// Draw High-Contrast Text Layer
		this.ctx.fillStyle = "#ffffff";
		this.ctx.textAlign = "left";
		this.ctx.fillText(text, badgeX + paddingX, badgeY + paddingY);
	}

	drawEmptyState() {
		this.ctx.clearRect(0, 0, this.width, this.height);

		this.ctx.fillStyle = "#666";
		this.ctx.font = "12px monospace";

		// Calculate positioning from the absolute center
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";

		// Draw centered text in the middle of the canvas
		this.ctx.fillText(
			"Drag & Drop, or Import Audio",
			this.width / 2,
			this.height / 2
		);
	}
}
