/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {createWatch, Watch, WatchCleanupRegisterFn} from "../primitives.js";
import {SchedulableEffect, scheduler} from "../../scheduler.js";

import {assertNotInReactiveContext} from "./asserts.js";
import type {EffectRef, EffectCleanupRegisterFn} from "./effect.js";

declare const SNUGGERY_DEV_MODE: boolean | undefined;

/**
 * Core reactive node for an Angular effect.
 *
 * `EffectHandle` combines the reactive graph's `Watch` base node for effects with the framework's
 * scheduling abstraction (`EffectScheduler`) as well as automatic cleanup via `DestroyRef` if
 * available/requested.
 */
class MicrotaskEffectHandle implements EffectRef, SchedulableEffect {
	readonly #effectFn: (onCleanup: EffectCleanupRegisterFn) => void;

	#destroyed = false;

	#watcher: Watch | null = null;

	constructor(effectFn: (onCleanup: EffectCleanupRegisterFn) => void) {
		this.#effectFn = effectFn;
	}

	run(): void {
		if (!this.#destroyed) {
			this.#watcher?.run();
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

	destroy(): void {
		this.#destroyed = true;

		this.#watcher?.destroy();
		this.#watcher = null;
	}

	hostConnected(): void {
		if (this.#watcher) {
			return;
		}

		this.#watcher = createWatch(
			(onCleanup) => this.#runEffect(onCleanup),
			() => {
				scheduler.schedule(this);
			},
			true,
		);

		this.#watcher.notify();
	}
}

/**
 * Create an `Effect` for the given reactive function tied to the given host.
 *
 * The effect is registered with the given {@link ReactiveControllerHost}, so it only runs when the element is connected
 * and stops running if the element disconnects. The effect will restart when the element is reconnected.
 *
 * @developerPreview
 */
export function microtaskEffect(
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef;
export function microtaskEffect(
	effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
	typeof SNUGGERY_DEV_MODE !== "undefined" &&
		SNUGGERY_DEV_MODE &&
		assertNotInReactiveContext(
			microtaskEffect,
			"Call `microtaskEffect` outside of a reactive context. For example, schedule the " +
				"effect inside the component constructor.",
		);

	return new MicrotaskEffectHandle(effectFn);
}
