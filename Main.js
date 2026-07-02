

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
			fileSize: document.getElementById("fileSize")
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
				pauseBtn: document.getElementById("pauseBtn"),
				stopBtn: document.getElementById("stopBtn")
			}
		);

		this.fileInput = document.getElementById("fileInput");

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