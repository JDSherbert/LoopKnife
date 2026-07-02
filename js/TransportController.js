

export class TransportController {
	constructor(session, buttons) {
		this.session = session;
		this.buttons = buttons;

		buttons.playBtn.addEventListener("click", () => this.session.engine.play());
		buttons.pauseBtn.addEventListener("click", () => this.session.engine.pause());
		buttons.stopBtn.addEventListener("click", () => this.session.engine.stop());

		this.setEnabled(false);

		this.session.on("loaded", () => this.setEnabled(true));
	}

	setEnabled(state) {
		this.buttons.playBtn.disabled = !state;
		this.buttons.pauseBtn.disabled = !state;
		this.buttons.stopBtn.disabled = !state;
	}
}