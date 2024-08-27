import {LitElement} from "lit";

import {listen} from "../listen.js";

describe("listen", () => {
	class TestElement extends LitElement {}
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

	it("should listen to events", () => {
		const spy = jasmine.createSpy("listener");

		listen(element, "test", spy);

		expect(spy).not.toHaveBeenCalled();

		element.dispatchEvent(new Event("test"));

		expect(spy).toHaveBeenCalledTimes(1);

		element.dispatchEvent(new Event("tost"));

		expect(spy).toHaveBeenCalledTimes(1);

		element.dispatchEvent(new Event("test"));

		expect(spy).toHaveBeenCalledTimes(2);
	});

	it("should stop listening when host disconnects", () => {
		const spy = jasmine.createSpy("listener");

		listen(element, "test", spy);
		element.dispatchEvent(new Event("test"));

		expect(spy).toHaveBeenCalledTimes(1);

		element.remove();

		element.dispatchEvent(new Event("test"));

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
