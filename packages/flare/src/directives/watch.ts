import {noChange} from "lit";
import {
	AsyncDirective,
	type DirectiveParameters,
	directive,
} from "lit/async-directive.js";

import {isSignal, type Signal} from "../signals/api/api.js";
import {type EffectRef, effect} from "../signals/api/effect.js";
import {untracked} from "../signals/api/untracked.js";

class WatchDirective extends AsyncDirective {
	#ref?: EffectRef;
	#signal?: Signal<unknown>;

	override render(value: unknown): unknown;
	override render(): void {}

	override update(_: unknown, [value]: DirectiveParameters<this>) {
		if (!isSignal(value)) {
			this.#ref?.destroy();
			this.#signal = undefined;

			return value;
		}

		if (value === this.#signal) {
			return noChange;
		}

		this.#ref?.destroy();

		this.#signal = value;

		let first = true;
		let firstValue = untracked(value);
		this.#ref = effect(() => {
			// read signal() before the if-check to ensure the dependency is present
			const v = value();

			if (first) {
				first = false;

				// Value hasn't changed in between the call to update() and the first run of the effect()
				//
				// Note we don't use the signal's equality function, so we might be
				// overly zealous in triggering setValue() again.
				const hasNotChanged = Object.is(v, firstValue);
				firstValue = null;

				if (hasNotChanged) {
					return;
				}
			}

			this.setValue(v);
		});

		return firstValue;
	}

	override disconnected() {
		this.#ref?.destroy();
		this.#ref = undefined;
	}

	override reconnected() {
		const signal = this.#signal;

		if (signal) {
			this.#ref?.destroy();
			this.#ref = effect(() => {
				const value = signal();
				this.setValue(value);
			});
		}
	}
}

/**
 * If passed a signal, automatically watch the signal and re-render this directive's location
 *
 * This allows for highly optimized re-rendering of parts of a template when a signal changes.
 *
 * In the example below, the `AlwaysRerenderOnChange` always re-runs the render function whenever any of the used signals change.
 * The `OptimizedUpdateOnRender` element will instead only update the binding of the changed signal(s).
 *
 * ```ts
 * class AlwaysRerenderOnChange extends FlareElement {
 *   one: Signal<string>;
 *   two: Signal<string>;
 *   render() {
 *     return html`
 *       <p>${this.one()}</p>
 *       <p>${this.two()}</p>
 *     `;
 *   }
 * }
 *
 * class OptimizedUpdateOnRender extends FlareElement {
 *   one: Signal<string>;
 *   two: Signal<string>;
 *   render() {
 *     return html`
 *       <p>${watch(this.one)}</p>
 *       <p>${watch(this.two)}</p>
 *     `;
 *   }
 * }
 * ```
 */
export const watch = directive(WatchDirective);
