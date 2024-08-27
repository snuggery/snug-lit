import {ElementPart, nothing} from "lit";
import {DirectiveResult, directive} from "lit/directive.js";
import {AsyncDirective} from "lit/async-directive.js";

import {Signal} from "../signals/api/api.js";
import {WritableSignal, signal} from "../signals/api/signal.js";
import {untracked} from "../signals/api/untracked.js";

class RefDirective extends AsyncDirective {
	#signal?: WritableSignal<Element | null>;
	#lastStoredValue: Element | null = null;

	override render(signal: WritableSignal<Element | null>): unknown;
	override render(): unknown {
		return nothing;
	}

	override update(
		part: ElementPart,
		[signal]: [WritableSignal<Element | null>],
	) {
		if (signal !== this.#signal) {
			this.#clear();
			this.#signal = signal;
		}

		this.#lastStoredValue = part.element;
		signal.set(part.element);
		return nothing;
	}

	#clear() {
		if (this.#signal && untracked(this.#signal) === this.#lastStoredValue) {
			this.#signal.set(null);
		}
	}

	override disconnected() {
		this.#clear();
	}

	override reconnected() {
		this.#signal?.set(this.#lastStoredValue);
	}
}

const refDirective = directive(RefDirective);

export interface RefSignal<T extends Element> extends Signal<T | null> {
	directive(): DirectiveResult;
}

export function ref<T extends Element = Element>(): RefSignal<T> {
	const refSignal = signal<T | null>(null);
	const directive = refDirective(refSignal);

	const result = refSignal.asReadonly() as RefSignal<T>;
	result.directive = () => directive;

	return result;
}
