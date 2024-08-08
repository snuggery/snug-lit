export interface SchedulableEffect {
	run(): void;
}

export interface Scheduler {
	/**
	 * Schedule the given effect to be executed at a later time.
	 *
	 * It is an error to attempt to execute any effects synchronously during a scheduling operation.
	 */
	scheduleEffect(e: SchedulableEffect): void;

	/**
	 * Run any scheduled effects.
	 */
	flush(): void;
}

class SchedulerImpl implements Scheduler {
	#queuedEffectCount = 0;
	#queue = new Set<SchedulableEffect>();
	#isScheduled = false;

	scheduleEffect(handle: SchedulableEffect): void {
		this.#enqueue(handle);

		if (!this.#isScheduled) {
			this.#isScheduled = true;
			queueMicrotask(() => {
				this.flush();
				this.#isScheduled = false;
			});
		}
	}

	#enqueue(handle: SchedulableEffect): void {
		if (this.#queue.has(handle)) {
			return;
		}
		this.#queuedEffectCount++;
		this.#queue.add(handle);
	}

	/**
	 * Run all scheduled effects.
	 */
	flush(): void {
		while (this.#queuedEffectCount > 0) {
			this.#flushQueue();
		}
	}

	#flushQueue(): void {
		for (const handle of this.#queue) {
			this.#queue.delete(handle);
			this.#queuedEffectCount--;

			// TODO: what happens if this throws an error?
			handle.run();
		}
	}
}

const kScheduler = Symbol.for("@snug-lit/flare scheduler");
export const scheduler: Scheduler = ((globalThis as any)[kScheduler] ??=
	new SchedulerImpl());
