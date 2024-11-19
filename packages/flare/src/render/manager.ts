/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {ReactiveController, ReactiveControllerHost} from "lit";

import type {Scheduler} from "../scheduler.js";

import type {AfterRenderRef} from "./hooks.js";

export class AfterRenderManager {
	/** Current set of active sequences. */
	readonly #sequences = new Set<AfterRenderSequence>();

	/** Tracks registrations made during the current set of executions. */
	readonly #deferredRegistrations = new Set<AfterRenderSequence>();

	/** Whether the `AfterRenderManager` is currently executing hooks. */
	executing = false;

	readonly #scheduler: Scheduler;

	constructor(scheduler: Scheduler) {
		this.#scheduler = scheduler;
	}

	/**
	 * Run the sequence of phases of hooks, once through. As a result of executing some hooks, more
	 * might be scheduled.
	 */
	execute(): void {
		this.executing = true;
		for (let phase = 0; phase < 4; phase++) {
			for (const sequence of this.#sequences) {
				if (sequence.erroredOrDestroyed || !sequence.hooks[phase]) {
					continue;
				}

				try {
					sequence.pipelinedValue = sequence.hooks[phase]!(
						sequence.pipelinedValue,
					);
				} catch (err) {
					sequence.erroredOrDestroyed = true;

					setTimeout(() => {
						throw err;
					});
				}
			}
		}
		this.executing = false;

		// Cleanup step to reset sequence state and also collect one-shot sequences for removal.
		for (const sequence of this.#sequences) {
			sequence.afterRun();
			if (sequence.once) {
				this.#sequences.delete(sequence);
			}
		}

		for (const sequence of this.#deferredRegistrations) {
			this.#sequences.add(sequence);
		}
		if (this.#deferredRegistrations.size > 0) {
			this.#scheduler.schedule();
		}
		this.#deferredRegistrations.clear();
	}

	register(sequence: AfterRenderSequence): void {
		if (!this.executing) {
			this.#sequences.add(sequence);
			this.#scheduler.schedule();
		} else {
			this.#deferredRegistrations.add(sequence);
		}
	}

	unregister(sequence: AfterRenderSequence): void {
		if (this.executing && this.#sequences.has(sequence)) {
			// We can't remove an `AfterRenderSequence` in the middle of iteration.
			// Instead, mark it as destroyed so it doesn't run any more, and mark it as one-shot so it'll
			// be removed at the end of the current execution.
			sequence.erroredOrDestroyed = true;
			sequence.pipelinedValue = undefined;
			sequence.once = true;
		} else {
			// It's safe to directly remove this sequence.
			this.#sequences.delete(sequence);
			this.#deferredRegistrations.delete(sequence);
		}
	}
}

export type AfterRenderHook = (value?: unknown) => unknown;
export type AfterRenderHooks = [
	earlyRead: AfterRenderHook | undefined,
	write: AfterRenderHook | undefined,
	mixedReadWrite: AfterRenderHook | undefined,
	read: AfterRenderHook | undefined,
];

export class AfterRenderSequence implements AfterRenderRef, ReactiveController {
	/**
	 * Whether this sequence errored or was destroyed during this execution, and hooks should no
	 * longer run for it.
	 */
	erroredOrDestroyed: boolean = false;

	/**
	 * The value returned by the last hook execution (if any), ready to be pipelined into the next
	 * one.
	 */
	pipelinedValue: unknown = undefined;

	readonly #manager: AfterRenderManager;
	readonly hooks: AfterRenderHooks;
	readonly #host?: ReactiveControllerHost;

	once: boolean;

	constructor(
		manager: AfterRenderManager,
		hooks: AfterRenderHooks,
		once: boolean,
		host?: ReactiveControllerHost,
	) {
		this.#manager = manager;
		this.hooks = hooks;
		this.once = once;
		this.#host = host;

		if (host) {
			host.addController(this);
		} else {
			this.hostConnected();
		}
	}

	afterRun(): void {
		this.erroredOrDestroyed = false;
		this.pipelinedValue = undefined;
	}

	destroy(): void {
		this.hostDisconnected();
		this.#host?.removeController(this);
	}

	hostConnected(): void {
		this.#manager.register(this);
	}

	hostDisconnected(): void {
		this.#manager.unregister(this);
	}
}
