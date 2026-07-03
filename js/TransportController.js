

export class TransportController {
	constructor(session, buttons) {
		this.session = session;
		this.buttons = buttons;

		buttons.playBtn.addEventListener("click", () => {
			this.session.engine.play(undefined, this.session.loop);
		});
		buttons.pauseBtn.addEventListener("click", () => this.session.engine.pause());
		buttons.stopBtn.addEventListener("click", () => this.session.engine.stop());
		buttons.playLoopBtn.addEventListener("click", () => {
			this.session.engine.playFromLoopStart(this.session.loop);
		});

		this.setEnabled(false);

		this.session.on("loaded", () => this.setEnabled(true));
	}

	setEnabled(state) {
		this.buttons.playBtn.disabled = !state;
		this.buttons.playLoopBtn.disabled = !state;
		this.buttons.pauseBtn.disabled = !state;
		this.buttons.stopBtn.disabled = !state;
	}
}