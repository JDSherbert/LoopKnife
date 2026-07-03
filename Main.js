

import { AudioEngine } from "./js/AudioEngine.js";
import { Renderer } from "./js/Renderer.js";
import { LoopRegion } from "./js/LoopRegion.js";
import { LoopEditor } from "./js/LoopEditor.js";
import { UI } from "./js/UI.js";
import { TransportController } from "./js/TransportController.js";
import { AudioSession } from "./js/AudioSession.js";
import { Exporter } from "./js/Exporter.js";

class Main {
	constructor() {

		this.engine = new AudioEngine();
		this.loop = new LoopRegion();
		this.session = new AudioSession(this.engine, this.loop);

		this.canvas = document.getElementById("waveCanvas");
		this.renderer = new Renderer(this.canvas);
		this.renderer.attach(this.session);

		this.ui = new UI({
			timeReadout: document.getElementById("timeReadout"),
			sampleReadout: document.getElementById("sampleReadout"),
			loopStartTime: document.getElementById("loopStartTime"),
			loopEndTime: document.getElementById("loopEndTime"),
			loopStartSample: document.getElementById("loopStartSample"),
			loopEndSample: document.getElementById("loopEndSample"),
			sampleRate: document.getElementById("sampleRate"),
			channels: document.getElementById("channels"),
			duration: document.getElementById("duration"),
			fileName: document.getElementById("fileName"),
			fileType: document.getElementById("fileType"),
			fileSize: document.getElementById("fileSize"),
			startLabel: document.getElementById("startLabel"),
			endLabel: document.getElementById("endLabel")
		});
		this.ui.bind(this.session);

		this.loopEditor = new LoopEditor(
			this.canvas,
			this.session,
			this.renderer
		);

		this.transport = new TransportController(
			this.session,
			{
				playBtn: document.getElementById("playBtn"),
				playLoopBtn: document.getElementById("playLoopBtn"),
				pauseBtn: document.getElementById("pauseBtn"),
				stopBtn: document.getElementById("stopBtn")
			}
		);

		this.fileInput = document.getElementById("fileInput");

		document.getElementById('clearBtn').addEventListener('click', () => {
			// True forces the browser to pull a fresh copy rather than relying on cached elements
			window.location.reload();
		});

		const dropZone = document.getElementById('waveContainer');

		// Block global window defaults absolutely
		window.addEventListener('dragover', (e) => {
			e.preventDefault();
		}, false);

		window.addEventListener('drop', (e) => {
			e.preventDefault();
		}, false);

		dropZone.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropZone.classList.add('drag-active');
		});

		dropZone.addEventListener('dragleave', () => {
			dropZone.classList.remove('drag-active');
		});

		// 1. ADDED 'async' keyword here so await works
		dropZone.addEventListener('drop', async (e) => {
			e.preventDefault();
			e.stopPropagation(); // Stop the event from bubbling up to the window
			dropZone.classList.remove('drag-active');

			if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

			const file = e.dataTransfer.files[0];

			// 2. FIXED: Fallback check for missing .ogg mime types
			const isAudioMime = file.type.startsWith('audio/');
			const isOggExtension = file.name.toLowerCase().endsWith('.ogg');

			if (isAudioMime || isOggExtension) {
				try {
					await this.session.open(file);
					this.ui.updateFileInfo(this.session);

					const exportBtn = document.getElementById("exportBtn");
					if (exportBtn) exportBtn.disabled = false;
				} catch (err) {
					console.error("Error loading dropped audio file:", err);
				}
			} else {
				console.warn("Rejected non-audio file drop:", file.name, "Mime:", file.type);
			}
		});

		this.init();
	}

	init() {

		this.fileInput.onchange = async (e) => {
			const file = e.target.files[0];

			await this.session.open(file);
			this.ui.updateFileInfo(this.session);
			exportBtn.disabled = false;
		};

		exportBtn.onclick = async () => { await Exporter.export(this.session); };

		this.startRenderLoop();
	}

	startRenderLoop() {
		const loop = () => {

			this.renderer.render();
			this.ui.updatePlayback(this.session);
			requestAnimationFrame(loop);
		};

		requestAnimationFrame(loop);
	}
}

window.addEventListener("DOMContentLoaded", () => {
	new Main();
});