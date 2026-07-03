/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class UI {
	constructor(elements) {
		this.el = elements;
	}

	bind(session) {
		const clamp = value => Math.max(0, Math.min(value, session.engine.duration));

		this.el.loopStartTime.addEventListener("change", () => {
			const value = parseFloat(this.el.loopStartTime.value);
			if (!isNaN(value)) {
				session.loop.setStart(clamp(value));
			}
		})
		this.el.loopEndTime.addEventListener("change", () => {
			const value = parseFloat(this.el.loopEndTime.value);
			if (!isNaN(value)) {
				session.loop.setEnd(clamp(value));
			}
		});
		this.el.loopStartSample.addEventListener("change", () => {
			const value = parseInt(this.el.loopStartSample.value);
			if (!isNaN(value)) {
				session.loop.setStart(value / session.engine.buffer.sampleRate);
			}
		});
		this.el.loopEndSample.addEventListener("change", () => {
			const value = parseInt(this.el.loopEndSample.value);
			if (!isNaN(value)) {
				session.loop.setEnd(value / session.engine.buffer.sampleRate);
			}
		});
	}

	updateFileInfo(session) {
		if (!session.fileInfo) return;

		// Audio properties
		this.el.sampleRate.textContent = session.engine.buffer.sampleRate;
		this.el.channels.textContent = session.engine.buffer.numberOfChannels;
		this.el.duration.textContent = session.engine.buffer.duration.toFixed(2);

		// File metadata
		if (session.fileInfo) {
			this.el.fileName.textContent = session.fileInfo.name;
			this.el.fileType.textContent = session.fileInfo.type;
			this.el.fileSize.textContent = (session.fileInfo.size / 1024).toFixed(1) + " KB";
		}
	}

	updatePlayback(session) {
		const engine = session.engine;
		const loop = session.loop;

		if (!engine.buffer) return;

		const time = engine.getPlaybackPosition();
		const sr = engine.buffer.sampleRate;

		// Readout display
		this.el.timeReadout.textContent = time.toFixed(3);
		this.el.sampleReadout.textContent = Math.floor(time * sr);

		// Loop times display - skip whichever input the user is currently editing
		if (document.activeElement !== this.el.loopStartTime) {
			this.el.loopStartTime.value = loop.getStart().toFixed(3);
		}
		if (document.activeElement !== this.el.loopEndTime) {
			this.el.loopEndTime.value = loop.getEnd().toFixed(3);
		}

		// Loop sample display - skip if the user is editing either input
		if (document.activeElement !== this.el.loopStartSample) {
			this.el.loopStartSample.value = Math.floor(loop.getStart() * sr);
			this.el.startLabel.textContent = `LOOPSTART=${this.el.loopStartSample.value}`;
		}
		if (document.activeElement !== this.el.loopEndSample) {
			this.el.loopEndSample.value = Math.floor(loop.getEnd() * sr);
			this.el.endLabel.textContent = `LOOPEND=${this.el.loopEndSample.value}`;
		}
	}
}