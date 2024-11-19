/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {ReactiveController, ReactiveControllerHost} from "lit";

import {
	scheduler,
	type SchedulableEffect,
	type Scheduler,
} from "../../scheduler.js";
import {createWatch, Watch, WatchCleanupRegisterFn} from "../primitives.js";

import {assertNotInReactiveContext} from "./asserts.js";

declare const SNUGGERY_DEV_MODE: boolean | undefined;

/**
 * An effect can, optionally, register a cleanup function. If registered, the cleanup is executed
 * before the next effect run. The cleanup function makes it possible to "cancel" any work that the
 * previous effect run might have started.
 *
 * @developerPreview
 */
export type EffectCleanupFn = () => void;

/**
 * A callback passed to the effect function that makes it possible to register cleanup logic.
 *
 * @developerPreview
 */
export type EffectCleanupRegisterFn = (cleanupFn: EffectCleanupFn) => void;

/**
 * Core reactive node for an Angular effect.
 *
 * `EffectHandle` combines the reactive graph's `Watch` base node for effects with the framework's
 * scheduling abstraction (`EffectScheduler`) as well as automatic cleanup via `DestroyRef` if
 * available/requested.
 */
class EffectHandle implements EffectRef, SchedulableEffect, ReactiveController {
	readonly #scheduler: Scheduler;
	readonly #effectFn: (onCleanup: EffectCleanupRegisterFn) => void;
	readonly #host: ReactiveControllerHost | null;
	readonly #allowSignalWrites: boolean;

	#watcher: Watch | null = null;

	constructor(
		scheduler: Scheduler,
		effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
		host: ReactiveControllerHost | null,
		allowSignalWrites: boolean,
	) {
		this.#scheduler = scheduler;
		this.#effectFn = effectFn;
		this.#host = host;
		this.#allowSignalWrites = allowSignalWrites;

		if (host) {
			host.addController(this);
		} else {
			this.hostConnected();
		}
	}

	#runEffect(onCleanup: WatchCleanupRegisterFn): void {
		try {
			this.#effectFn(onCleanup);
		} catch (err) {
			setTimeout(() => {
				throw err;
			});
		}
	}

	run(): void {
		this.#watcher?.run();
	}

	#schedule(): void {
		this.#scheduler.schedule(this);
	}

	destroy(): void {
		this.hostDisconnected();
		this.#host?.removeController(this);

		// Note: if the effect is currently scheduled, it's not un-scheduled, and so the scheduler will
		// retain a reference to it. Attempting to execute it will be a no-op.
	}

	hostConnected(): void {
		if (this.#watcher) {
			return;
		}

		this.#watcher = createWatch(
			(onCleanup) => this.#runEffect(onCleanup),
			() => this.#schedule(),
			this.#allowSignalWrites,
		);

		this.#watcher.notify();
	}

	hostDisconnected(): void {
		this.#watcher?.destroy();
		this.#watcher = null;
	}
}

/**
 * A global reactive effect, which can be manually destroyed.
 *
 * @developerPreview
 */
export interface EffectRef {
	/**
	 * Shut down the effect, removing it from any upcoming scheduled executions.
	 */
	destroy(): void;
}

/**
 * Options passed to the `effect` function.
 *
 * @developerPreview
 */
export interface CreateEffectOptions {
	/**
	 * The `ReactiveControllerHost` in which to create the effect.
	 */
	host?: ReactiveControllerHost;

	/**
	 * Whether to clean up the effect manually
	 */
	manualCleanup?: boolean;

	/**
	 * Whether the `effect` should allow writing to signals.
	 *
	 * Using effects to synchronize data by writing to signals can lead to confusing and potentially
	 * incorrect behavior, and should be enabled only when necessary.
	 */
	allowSignalWrites?: boolean;
}

/**
 * Create a global `Effect` for the given reactive function.
 *
 * The effect is registered with the given {@link ReactiveControllerHost}, so it only runs when the element is connected
 * and stops running if the element disconnects. The effect will restart when the element is reconnected.
 *
 * @developerPreview
 */
export function effect(
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
	options: CreateEffectOptions & {
		host: ReactiveControllerHost;
		manualCleanup?: false;
	},
): EffectRef;
/**
 * Create a global `Effect` for the given reactive function.
 *
 * The effect will continue to run until it is destroyed by calling the returned reference's `destroy` method.
 *
 * @developerPreview
 */
export function effect(
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
	options: CreateEffectOptions & {host?: undefined; manualCleanup: true},
): EffectRef;
export function effect(
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
	options: CreateEffectOptions,
): EffectRef {
	typeof SNUGGERY_DEV_MODE !== "undefined" &&
		SNUGGERY_DEV_MODE &&
		assertNotInReactiveContext(
			effect,
			"Call `effect` outside of a reactive context. For example, schedule the " +
				"effect inside the component constructor.",
		);

	if (!options.host && !options.manualCleanup) {
		throw new Error(
			"effect() requires either a host to be passed or manualCleanup to be set to true",
		);
	}

	return new EffectHandle(
		scheduler,
		effectFn,
		options.host ?? null,
		options.allowSignalWrites ?? false,
	);
}
