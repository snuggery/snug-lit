/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type {ReactiveControllerHost} from "lit";

import {scheduler} from "../scheduler";

import {
	type AfterRenderHooks,
	AfterRenderManager,
	AfterRenderSequence,
} from "./manager";

/**
 * Options passed to `afterRender` and `afterNextRender`.
 */
export interface AfterRenderOptions {
	/**
	 * The `ReactiveControllerHost` to tie the render hook to
	 */
	host: ReactiveControllerHost;
}

/**
 * An argument list containing the first non-never type in the given type array, or an empty
 * argument list if there are no non-never types in the type array.
 */
export type ɵFirstAvailable<T extends unknown[]> = T extends [
	infer H,
	...infer R,
]
	? [H] extends [never]
		? ɵFirstAvailable<R>
		: [H]
	: [];

/**
 * A callback that runs after render.
 */
export interface AfterRenderRef {
	/**
	 * Shut down the callback, preventing it from being called again.
	 */
	destroy(): void;
}

/**
 * Register callbacks to be invoked each time the application finishes rendering, during the
 * specified phases. The available phases are:
 * - `earlyRead`
 *   Use this phase to **read** from the DOM before a subsequent `write` callback, for example to
 *   perform custom layout that the browser doesn't natively support. Prefer the `read` phase if
 *   reading can wait until after the write phase. **Never** write to the DOM in this phase.
 * - `write`
 *    Use this phase to **write** to the DOM. **Never** read from the DOM in this phase.
 * - `mixedReadWrite`
 *    Use this phase to read from and write to the DOM simultaneously. **Never** use this phase if
 *    it is possible to divide the work among the other phases instead.
 * - `read`
 *    Use this phase to **read** from the DOM. **Never** write to the DOM in this phase.
 *
 * <div class="alert is-critical">
 *
 * You should prefer using the `read` and `write` phases over the `earlyRead` and `mixedReadWrite`
 * phases when possible, to avoid performance degradation.
 *
 * </div>
 *
 * Note that:
 * - Callbacks run in the following phase order *after each render*:
 *   1. `earlyRead`
 *   2. `write`
 *   3. `mixedReadWrite`
 *   4. `read`
 * - Callbacks in the same phase run in the order they are registered.
 *
 * The first phase callback to run as part of this spec will receive no parameters. Each
 * subsequent phase callback in this spec will receive the return value of the previously run
 * phase callback as a parameter. This can be used to coordinate work across multiple phases.
 *
 * @param spec The callback functions to register
 * @param options Options to control the behavior of the callback
 */
export function afterRender<E = never, W = never, M = never>(
	spec: {
		earlyRead?: () => E;
		write?: (...args: ɵFirstAvailable<[E]>) => W;
		mixedReadWrite?: (...args: ɵFirstAvailable<[W, E]>) => M;
		read?: (...args: ɵFirstAvailable<[M, W, E]>) => void;
	},
	options: AfterRenderOptions,
): AfterRenderRef;
export function afterRender(
	spec: {
		earlyRead?: () => unknown;
		write?: (arg: unknown) => unknown;
		mixedReadWrite?: (arg: unknown) => unknown;
		read?: (arg: unknown) => void;
	},
	options: AfterRenderOptions,
): AfterRenderRef {
	return afterRenderImpl(spec, options, false);
}

/**
 * Register callbacks to be invoked the next time the application finishes rendering, during the
 * specified phases. The available phases are:
 * - `earlyRead`
 *   Use this phase to **read** from the DOM before a subsequent `write` callback, for example to
 *   perform custom layout that the browser doesn't natively support. Prefer the `read` phase if
 *   reading can wait until after the write phase. **Never** write to the DOM in this phase.
 * - `write`
 *    Use this phase to **write** to the DOM. **Never** read from the DOM in this phase.
 * - `mixedReadWrite`
 *    Use this phase to read from and write to the DOM simultaneously. **Never** use this phase if
 *    it is possible to divide the work among the other phases instead.
 * - `read`
 *    Use this phase to **read** from the DOM. **Never** write to the DOM in this phase.
 *
 * <div class="alert is-critical">
 *
 * You should prefer using the `read` and `write` phases over the `earlyRead` and `mixedReadWrite`
 * phases when possible, to avoid performance degradation.
 *
 * </div>
 *
 * Note that:
 * - Callbacks run in the following phase order *once, after the next render*:
 *   1. `earlyRead`
 *   2. `write`
 *   3. `mixedReadWrite`
 *   4. `read`
 * - Callbacks in the same phase run in the order they are registered.
 *
 * The first phase callback to run as part of this spec will receive no parameters. Each
 * subsequent phase callback in this spec will receive the return value of the previously run
 * phase callback as a parameter. This can be used to coordinate work across multiple phases.
 *
 * @param spec The callback functions to register
 * @param options Options to control the behavior of the callback
 */
export function afterNextRender<E = never, W = never, M = never>(
	spec: {
		earlyRead?: () => E;
		write?: (...args: ɵFirstAvailable<[E]>) => W;
		mixedReadWrite?: (...args: ɵFirstAvailable<[W, E]>) => M;
		read?: (...args: ɵFirstAvailable<[M, W, E]>) => void;
	},
	options?: Partial<AfterRenderOptions>,
): AfterRenderRef;
export function afterNextRender(
	spec: {
		earlyRead?: () => unknown;
		write?: (value?: unknown) => unknown;
		mixedReadWrite?: (value?: unknown) => unknown;
		read?: (value?: unknown) => void;
	},
	options?: Partial<AfterRenderOptions>,
): AfterRenderRef {
	return afterRenderImpl(spec, options, true);
}

/**
 * Shared implementation for `afterRender` and `afterNextRender`.
 */
function afterRenderImpl(
	spec: {
		earlyRead?: () => unknown;
		write?: (r?: unknown) => unknown;
		mixedReadWrite?: (r?: unknown) => unknown;
		read?: (r?: unknown) => void;
	},
	options: Partial<AfterRenderOptions> | undefined,
	once: boolean,
): AfterRenderRef {
	// Lazily initialize the handler implementation, if necessary. This is so that it can be
	// tree-shaken if `afterRender` and `afterNextRender` aren't used.
	scheduler.renderManager ??= new AfterRenderManager(scheduler);

	const hooks: AfterRenderHooks = [
		spec.earlyRead,
		spec.write,
		spec.mixedReadWrite,
		spec.read,
	];

	const sequence = new AfterRenderSequence(
		scheduler.renderManager,
		hooks,
		once,
		options?.host,
	);
	scheduler.renderManager.register(sequence);

	return sequence;
}
