/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

import { Importer } from "./Importer.js";

export class AudioEngine {
	constructor() {
		this.ctx = new (window.AudioContext || window.webkitAudioContext)();

		// Create the persistent volume (gain) node
		this.gainNode = this.ctx.createGain();
		this.gainNode.gain.value = 0.7; // Initialized volume matching slider (70%)

		// Create the real-time analyzer engine node
		this.analyser = this.ctx.createAnalyser();
		this.analyser.fftSize = 64; // Small window size for fast audio amplitude calculations
		this.analyserBuffer = new Uint8Array(this.analyser.frequencyBinCount);

		// Chain the volume directly into the meter, and the meter into the speakers
		this.gainNode.connect(this.analyser);
		this.analyser.connect(this.ctx.destination);

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

		// Read the array buffer once from disk
		this.originalBytes = await file.arrayBuffer();

		// Clone the bytes in memory so decodeAudioData doesn't corrupt our export/meta backup
		const decodeBuffer = this.originalBytes.slice(0);
		const buffer = await this.ctx.decodeAudioData(decodeBuffer);
		this.buffer = buffer;

		const totalSamples = buffer.length;
		let detectedLoop = null;

		const filename = file.name.toLowerCase();
		if (filename.endsWith('.wav')) {
			detectedLoop = Importer.extractWavLoopTags(this.originalBytes);
		} else if (filename.endsWith('.ogg')) {
			detectedLoop = Importer.extractOggLoopTags(this.originalBytes);
		}

		// Normalize values safely within sample boundaries
		if (detectedLoop && detectedLoop.start !== null && detectedLoop.end !== null) {
			console.log(`Detected existing loop metadata! Start: ${detectedLoop.start}, End: ${detectedLoop.end}`);
			this.loopStartSamples = Math.max(0, Math.min(detectedLoop.start, totalSamples));
			this.loopEndSamples = Math.max(this.loopStartSamples, Math.min(detectedLoop.end, totalSamples));
		} else {
			this.loopStartSamples = 0;
			this.loopEndSamples = totalSamples;
		}

		// Return the calculated markers so AudioSession / UI can bind them
		return {
			startSamples: this.loopStartSamples,
			endSamples: this.loopEndSamples,
			totalSamples: totalSamples
		};
	}

	async play(offset = this.playbackOffset, loopRegion = null) {

		if (!this.buffer) return;

		await this.ctx.resume();

		this.stop();

		// Play sound using web audio API
		this.source = this.ctx.createBufferSource();
		this.source.buffer = this.buffer;
		this.source.connect(this.gainNode);

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

		//this.source.connect(this.ctx.destination);
		this.source.connect(this.gainNode);

		this.playbackStartTime = this.ctx.currentTime;
		this.playbackOffset = offset;

		this.source.start(0, offset);

		this.isPlaying = true;
	}

	async playFromLoopStart(loopRegion = null) {
		if (!this.buffer) return;

		const hasValidLoop =
			loopRegion && loopRegion.getEnd() > loopRegion.getStart();

		const offset = hasValidLoop
			? loopRegion.getStart()
			: 0.0;

		await this.play(offset, loopRegion);
	}

	pause() {

		if (!this.isPlaying) return;

		// Cache position (sample) and reapply
		const pos = this.getPlaybackPosition();
		this.stop();
		this.playbackOffset = pos;
	}

	stop() {

		if (this.source) {
			try { this.source.stop(); } catch { }
			this.source.disconnect();
		}

		// Purge all data
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

		// Find position based on samples
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

	setVolume(value) {
		if (this.gainNode) {
			// Clear any upcoming scheduled audio parameter changes
			this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);

			// If the slider is at absolute 0, slam the volume to absolute 0
			if (value === 0) {
				this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.02);
			} else {
				// Transform the linear slider value (0.01 - 1.0) into an exponential audio curve
				const gainValue = Math.pow(value, 2);
				this.gainNode.gain.linearRampToValueAtTime(gainValue, this.ctx.currentTime + 0.02);
			}
		}
	}

	// Computes the current overall volume peak level (0.0 to 100.0)
	getVolumeLevel() {
		// If we aren't playing, or the volume is actively muted, don't calculate anything
		if (!this.isPlaying || this.gainNode.gain.value === 0) return 0;

		this.analyser.getByteTimeDomainData(this.analyserBuffer);

		let sum = 0;
		for (let i = 0; i < this.analyserBuffer.length; i++) {
			const amplitude = (this.analyserBuffer[i] - 128) / 128;
			sum += amplitude * amplitude;
		}

		const rms = Math.sqrt(sum / this.analyserBuffer.length);

		// Scale matching the real gain value so the bar accurately visually mirrors the volume
		return Math.min(100, rms * 400 * this.gainNode.gain.value);
	}
}
