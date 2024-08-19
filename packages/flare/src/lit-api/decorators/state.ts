import type {StateDeclaration} from "lit/decorators.js";

import {property} from "./property.js";

export * from "lit/decorators/state.js";

/**
 * Declares a private or protected reactive property that still triggers
 * updates to the element when it changes. It does not reflect from the
 * corresponding attribute.
 *
 * Properties declared this way must not be used from HTML or HTML templating
 * systems, they're solely for properties internal to the element. These
 * properties may be renamed by optimization tools like closure compiler.
 * @category Decorator
 */
export function state(options?: StateDeclaration) {
	return property({
		...options,
		// Add both `state` and `attribute` because we found a third party
		// controller that is keying off of PropertyOptions.state to determine
		// whether a field is a private internal property or not.
		state: true,
		attribute: false,
	});
}
