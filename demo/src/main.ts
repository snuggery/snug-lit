import {
	FlareElement,
	OpenFlareElement,
	css,
	html,
	signal,
} from "@snug-lit/flare";
import {customElement, property, state} from "@snug-lit/flare/decorators.js";

@customElement("demo-app")
class DemoAppElement extends FlareElement {
	@state()
	declare state: number;

	signal = signal(0);

	constructor() {
		super();

		this.state = 0;
	}

	#increaseState() {
		this.state++;
	}

	#increaseSignal() {
		this.signal.update((v) => v + 1);
	}

	protected override render(): unknown {
		return html`
			<p>
				State:
				<demo-el .value=${this.state}></demo-el>
				<button @click=${this.#increaseState}>increase</button>
			</p>
			<p>
				Signal:
				<demo-el .value=${this.signal()}></demo-el>
				<button @click=${this.#increaseSignal}>increase</button>
			</p>

			<demo-list>
				<ul>
					<li>One</li>
					<li>Two</li>
					<li>Three</li>
				</ul>
			</demo-list>
		`;
	}
}

@customElement("demo-el")
class DemoElElement extends FlareElement {
	@property({type: Number})
	declare value: number;

	protected override render(): unknown {
		return html`${this.value}`;
	}
}

@customElement("demo-list")
class DemoListElment extends OpenFlareElement {
	static override styles = css`
		demo-list {
			display: contents;

			> :is(ul, ol) > li {
				text-decoration: underline;
			}
		}
	`;
}
