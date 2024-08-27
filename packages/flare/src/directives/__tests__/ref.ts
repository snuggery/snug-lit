import {html} from "lit";

import {FlareElement} from "../../flare-element.js";
import {ref} from "../ref.js";
import {getSignal} from "../../reactive-input-element.js";

describe("ref()", () => {
	class TestElement extends FlareElement {
		static override properties = {
			two: {type: Boolean},
		};

		#ref = ref();

		declare two?: boolean;

		protected override render(): unknown {
			const el = this.two
				? html`<div id="two" ${this.#ref.directive()}></div>`
				: html`<div id="one" ${this.#ref.directive()}></div>`;

			return html`${el}<span id="result">${this.#ref()?.id}</span>`;
		}
	}

	let name: string;
	beforeAll(() => {
		name = `test-element-ref-${Math.random().toString().slice(2, 7)}`;

		customElements.define(name, TestElement);
	});

	let element: TestElement;

	beforeEach(() => {
		element = document.createElement(name) as TestElement;
		document.body.append(element);
	});

	afterEach(() => {
		element.remove();
	});

	it("should work", async () => {
		await element.updateComplete;

		const result = element.shadowRoot!.querySelector("#result") as HTMLElement;

		expect(result.innerText).toBe("one");

		element.two = true;

		await element.updateComplete;

		expect(result.innerText).toBe("two");
	});
});
