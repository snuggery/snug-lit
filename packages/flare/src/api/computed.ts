/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {createComputed, SIGNAL} from "../primitives.js";

import {Signal, ValueEqualityFn} from "./api.js";

declare const SNUGGERY_DEV_MODE: boolean | undefined;

/**
 * Options passed to the `computed` creation function.
 */
export interface CreateComputedOptions<T> {
	/**
	 * A comparison function which defines equality for computed values.
	 */
	equal?: ValueEqualityFn<T>;
}

/**
 * Create a computed `Signal` which derives a reactive value from an expression.
 */
export function computed<T>(
	computation: () => T,
	options?: CreateComputedOptions<T>,
): Signal<T> {
	const getter = createComputed(computation);
	if (options?.equal) {
		getter[SIGNAL].equal = options.equal;
	}
	if (typeof SNUGGERY_DEV_MODE !== "undefined" && SNUGGERY_DEV_MODE) {
		getter.toString = () => `[Computed: ${getter()}]`;
	}
	return getter;
}
