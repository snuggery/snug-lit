/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {getActiveConsumer} from "../primitives.js";

declare const SNUGGERY_DEV_MODE: boolean | undefined;

/**
 * Asserts that the current stack frame is not within a reactive context. Useful
 * to disallow certain code from running inside a reactive context (see {@link toSignal}).
 *
 * @param debugFn a reference to the function making the assertion (used for the error message).
 *
 * @publicApi
 */
export function assertNotInReactiveContext(
	debugFn: Function,
	extraContext?: string,
): void {
	// Taking a `Function` instead of a string name here prevents the un-minified name of the function
	// from being retained in the bundle regardless of minification.
	if (getActiveConsumer() !== null) {
		throw new Error(
			((typeof SNUGGERY_DEV_MODE !== "undefined" && SNUGGERY_DEV_MODE) || "") &&
				`${debugFn.name}() cannot be called from within a reactive context.${
					extraContext ? ` ${extraContext}` : ""
				}`,
		);
	}
}
