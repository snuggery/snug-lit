/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {ReactiveController, ReactiveControllerHost} from "lit";

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
class EffectHandle implements EffectRef, ReactiveController {
	readonly #effectFn: (onCleanup: EffectCleanupRegisterFn) => void;
	readonly #host: ReactiveControllerHost;

	#watcher: Watch | null = null;
	#dirty = false;

	constructor(
		effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
		host: ReactiveControllerHost,
	) {
		this.#effectFn = effectFn;
		this.#host = host;

		host.addController(this);
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

	hostUpdate(): void {
		if (!this.#dirty) {
			return;
		}

		this.#dirty = false;
		this.#watcher?.run();
	}

	destroy(): void {
		this.hostDisconnected();
		this.#host.removeController(this);
	}

	hostConnected(): void {
		if (this.#watcher) {
			return;
		}

		this.#watcher = createWatch(
			(onCleanup) => this.#runEffect(onCleanup),
			() => {
				this.#dirty = true;
				this.#host.requestUpdate();
			},
			true,
		);

		this.#watcher.notify();
	}

	hostDisconnected(): void {
		this.#watcher?.destroy();
		this.#watcher = null;
	}
}

/**
 * A reactive effect, which can be manually destroyed.
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
 * Create an `Effect` for the given reactive function tied to the given host.
 *
 * The effect is registered with the given {@link ReactiveControllerHost}, so it only runs when the element is connected
 * and stops running if the element disconnects. The effect will restart when the element is reconnected.
 *
 * @developerPreview
 */
export function effect(
	host: ReactiveControllerHost,
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef;
export function effect(
	host: ReactiveControllerHost,
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
	typeof SNUGGERY_DEV_MODE !== "undefined" &&
		SNUGGERY_DEV_MODE &&
		assertNotInReactiveContext(
			effect,
			"Call `effect` outside of a reactive context. For example, schedule the " +
				"effect inside the component constructor.",
		);

	return new EffectHandle(effectFn, host);
}
