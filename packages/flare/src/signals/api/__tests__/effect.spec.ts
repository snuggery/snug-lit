import {FlareElement} from "../../../flare-element.js";
import {effect} from "../effect.js";
import {signal} from "../signal.js";

describe("effect", () => {
	class TestElement extends FlareElement {}
	let name: string;

	beforeAll(() => {
		name = `test-element-listen-${Math.random().toString().slice(2, 7)}`;

		customElements.define(name, TestElement);
	});

	let element: TestElement;

	beforeEach(() => {
		element = document.createElement(name) as TestElement;
		document.body.append(element);
	});

	afterEach(() => element.remove());

	it("should work", async () => {
		const source = signal(0);

		let lastSeenValue = -1;
		effect(element, () => {
			lastSeenValue = source();
		});

		await element.updateComplete;

		expect(lastSeenValue).toBe(0);

		source.set(1);

		expect(lastSeenValue).toBe(0);

		source.set(2);

		expect(lastSeenValue).toBe(0);

		await element.updateComplete;

		expect(lastSeenValue).toBe(2);
	});
});
