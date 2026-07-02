

export class UI {
	constructor(elements) {
		this.el = elements;
	}

	update(session) {
		const engine = session.engine;
		const loop = session.loop;

		if (!engine.buffer) return;

		const time = engine.getPlaybackPosition();
		const sr = engine.buffer.sampleRate;

		// Readout display
		this.el.timeReadout.textContent = time.toFixed(3);
		this.el.sampleReadout.textContent = Math.floor(time * sr);

		// Loop times display
		this.el.loopStartTime.textContent = loop.getStart().toFixed(3);
		this.el.loopEndTime.textContent = loop.getEnd().toFixed(3);

		// Loop sample display
		this.el.loopStartSample.textContent = Math.floor(loop.getStart() * sr);
		this.el.loopEndSample.textContent = Math.floor(loop.getEnd() * sr);

		// TODO: These are set each frame, but they only need to be set once when the file is loaded.
		// Move them to a separate function that is called on file load.

		// Audio properties
		this.el.sampleRate.textContent = sr;
		this.el.channels.textContent = engine.buffer.numberOfChannels;
		this.el.duration.textContent = engine.buffer.duration.toFixed(2);

		// File metadata
		if (session.fileInfo) {
			this.el.fileName.textContent = session.fileInfo.name;
			this.el.fileType.textContent = session.fileInfo.type;
			this.el.fileSize.textContent = (session.fileInfo.size / 1024).toFixed(1) + " KB";
		}
	}
}