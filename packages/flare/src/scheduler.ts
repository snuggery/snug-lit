import type {AfterRenderManager} from "./render/manager.js";

export interface SchedulableEffect {
	run(): void;
}

export interface Scheduler {
	/**
	 * Schedule the given effect to be executed at a later time.
	 *
	 * It is an error to attempt to execute any effects synchronously during a scheduling operation.
	 */
	schedule(e?: SchedulableEffect): void;

	/**
	 * Run any scheduled effects.
	 */
	flush(): void;

	renderManager?: AfterRenderManager;

	readonly running: boolean;
}

class SchedulerImpl implements Scheduler {
	#queuedEffectCount = 0;
	#queue = new Set<SchedulableEffect>();
	#isScheduled = false;
	#runningEffects = false;
	#runningRenderEffects = false;

	renderManager?: AfterRenderManager;

	schedule(handle?: SchedulableEffect): void {
		handle && this.#enqueue(handle);

		if (!this.#isScheduled && !this.#runningEffects) {
			this.#isScheduled = true;
			queueMicrotask(() => {
				this.#isScheduled = false;
				this.flush();
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
		this.#runningEffects = true;

		try {
			while (this.#queuedEffectCount > 0) {
				this.#flushQueue();
			}
		} finally {
			this.#runningEffects = false;
		}

		this.#runningRenderEffects = true;
		try {
			this.renderManager?.execute();
		} finally {
			this.#runningRenderEffects = false;
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

	get running() {
		return this.#runningEffects || this.#runningRenderEffects;
	}
}

const kScheduler = Symbol.for("@snug-lit/flare scheduler");
export const scheduler: Scheduler = ((globalThis as any)[kScheduler] ??=
	new SchedulerImpl());
