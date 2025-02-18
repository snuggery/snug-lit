import {scheduler} from "../../../scheduler.js";
import {microtaskEffect} from "../microtask-effect.js";
import {signal} from "../signal.js";

function tick() {
	return new Promise<void>((resolve) =>
		scheduler.schedule({
			run: resolve,
		}),
	);
}

describe("microtaskEffect", () => {
	it("should work", async () => {
		const source = signal(0);

		let lastSeenValue = -1;
		let ref = microtaskEffect(() => {
			lastSeenValue = source();
		});

		expect(lastSeenValue).toBe(-1);

		await tick();

		expect(lastSeenValue).toBe(0);

		source.set(1);

		expect(lastSeenValue).toBe(0);

		source.set(2);

		expect(lastSeenValue).toBe(0);

		await tick();

		expect(lastSeenValue).toBe(2);

		source.set(3);
		ref.destroy();

		await tick();

		expect(lastSeenValue).toBe(2);
	});
});
