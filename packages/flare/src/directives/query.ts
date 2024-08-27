import {nothing} from "lit";
import {AsyncDirective, PartType, directive} from "lit/async-directive.js";
import type {
	DirectiveParameters,
	DirectiveResult,
	Part,
} from "lit/directive.js";

import type {Signal} from "../signals/api/api.js";
import {WritableSignal, signal} from "../signals/api/signal.js";
import {computed} from "../signals/api/computed.js";

export interface QueryAssignedNodesOptions extends AssignedNodesOptions {
	/**
	 * Whether to include this node in the result
	 */
	filter?: (node: Node) => boolean;
}

export interface TypedQueryAssignedNodesOptions<T extends Node>
	extends AssignedNodesOptions {
	/**
	 * Whether to include this node in the result
	 */
	filter: (node: Node) => node is T;
}

export interface QueryAssignedElementsOptions extends AssignedNodesOptions {
	/**
	 * Whether to include this element in the result
	 */
	filter?: (element: Element) => boolean;
}

export interface TypedQueryAssignedElementsOptions<T extends Element>
	extends AssignedNodesOptions {
	/**
	 * Whether to include this element in the result
	 */
	filter: (element: Element) => element is T;
}

export interface AssignedNodesSignal<T extends Node = Node>
	extends Signal<readonly T[]> {
	slot(): DirectiveResult;
}

export interface AssignedElementsSignal<T extends Element = Element>
	extends Signal<readonly T[]> {
	slot(): DirectiveResult;
}

abstract class QueryDirective<T extends Node> extends AsyncDirective {
	#signal?: WritableSignal<readonly T[]>;
	#options?: AssignedNodesOptions;

	#abortListener?: AbortController;
	#element?: HTMLSlotElement;

	override render(
		signal: WritableSignal<readonly T[]>,
		options: AssignedNodesOptions,
	): unknown;
	override render(): unknown {
		return nothing;
	}

	override update(
		part: Part,
		[signal, options]: DirectiveParameters<this>,
	): unknown {
		if (
			part.type !== PartType.ELEMENT ||
			!("assignedElements" in part.element)
		) {
			throw new Error(
				"queryAssignedElements().slot() must be used as element directive on a slot",
			);
		}

		this.#signal = signal;
		this.#options = options;

		if (part.element !== this.#element) {
			this.#abortListener?.abort();
			this.#abortListener = undefined;

			this.#element = part.element as HTMLSlotElement;

			if (this.isConnected) {
				this.reconnected();
			}
		}

		return nothing;
	}

	protected override reconnected(): void {
		if (this.#abortListener || !this.#element) {
			// already listening
			return;
		}

		const {signal} = (this.#abortListener = new AbortController());

		const element = this.#element;
		const options = this.#options!;

		this.#element.addEventListener(
			"slotchange",
			() => {
				this.#signal?.set(this.getNodes(element, options));
			},
			{signal},
		);
	}

	abstract getNodes(
		element: HTMLSlotElement,
		options: AssignedNodesOptions,
	): readonly T[];

	protected override disconnected(): void {
		this.#abortListener?.abort();
		this.#abortListener = undefined;
	}
}

const _queryNodes = directive(
	class extends QueryDirective<Node> {
		override getNodes(
			element: HTMLSlotElement,
			options: AssignedNodesOptions,
		): readonly Node[] {
			return element.assignedNodes(options);
		}
	},
);

const _queryElements = directive(
	class extends QueryDirective<Element> {
		override getNodes(
			element: HTMLSlotElement,
			options: AssignedNodesOptions,
		): readonly Element[] {
			return element.assignedElements(options);
		}
	},
);

/**
 * Query assigned nodes to a slot
 *
 * The returned signal updates whenever the assigned nodes change.
 *
 * ```ts
 * class TestElement extends FlareElement {
 *   #content = queryAssignedNodes({
 *     flatten: true,
 *	   filter: node => node instanceof Element || node instanceof Text,
 *   });
 *
 *   constructor() {
 *     super();
 *
 *     const hasContent = computed(() => this.#content().length > 0);
 *
 *     effect(
 *       () =>
 *         this.classList.toggle('has-content', hasContent()),
 *       {host: this},
 *     );
 *   }
 *
 *   render() {
 *     return html`<slot ${this.#content.slot()}></slot>`;
 *   }
 * }
 * ```
 */
export function queryAssignedNodes<T extends Node>(
	options: TypedQueryAssignedNodesOptions<T>,
): AssignedNodesSignal<T>;
/**
 * Query assigned nodes to a slot
 *
 * The returned signal updates whenever the assigned nodes change.
 *
 * ```ts
 * const isContent = (node: Node) => node instanceof Element || node instanceof Text;
 *
 * class TestElement extends FlareElement {
 *   #content = queryAssignedNodes({
 *     flatten: true,
 *   });
 *
 *   constructor() {
 *     super();
 *
 *     const hasContent = computed(() => this.#content().some(isContent));
 *
 *     effect(
 *       () =>
 *         this.classList.toggle('has-content', hasContent()),
 *       {host: this},
 *     );
 *   }
 *
 *   render() {
 *     return html`<slot ${this.#content.slot()}></slot>`;
 *   }
 * }
 * ```
 */
export function queryAssignedNodes(
	options?: QueryAssignedNodesOptions,
): AssignedNodesSignal;
export function queryAssignedNodes({
	filter,
	...options
}: QueryAssignedNodesOptions = {}): AssignedNodesSignal {
	const elements = signal<readonly Element[]>([], {equal: areArraysEqual});

	let result: Signal<readonly Element[]>;

	if (filter != null) {
		result = computed(() => elements().filter(filter), {equal: areArraysEqual});
	} else {
		result = elements.asReadonly();
	}

	return Object.assign(result, {slot: () => _queryNodes(elements, options)});
}

/**
 * Query assigned elements to a slot
 *
 * The returned signal updates whenever the assigned elements change.
 *
 * ```ts
 * class TestElement extends FlareElement {
 *   #assignedButtons = queryAssignedElements({
 *     flatten: true,
 *	   filter: element => element instanceof HTMLButtonElement,
 *   });
 *
 *   constructor() {
 *     super();
 *
 *     const hasButton = computed(() => this.#assignedButtons().length > 0);
 *
 *     effect(
 *       () =>
 *         this.classList.toggle('has-button', hasButton()),
 *       {host: this},
 *     );
 *   }
 *
 *   render() {
 *     return html`<slot ${this.#assignedButtons.slot()}></slot>`;
 *   }
 * }
 * ```
 */
export function queryAssignedElements<T extends Element>(
	options: TypedQueryAssignedElementsOptions<T>,
): AssignedElementsSignal<T>;
/**
 * Query assigned elements to a slot
 *
 * The returned signal updates whenever the assigned elements change.
 *
 * ```ts
 * const isButton = (el: Element) => el instanceof HTMLButtonElement;
 *
 * class TestElement extends FlareElement {
 *   #assignedElements = queryAssignedElements({
 *     flatten: true,
 *   });
 *
 *   constructor() {
 *     super();
 *
 *     const hasButton = computed(() => this.#assignedElements().some(isButton));
 *
 *     effect(
 *       () =>
 *         this.classList.toggle('has-button', hasButton()),
 *       {host: this},
 *     );
 *   }
 *
 *   render() {
 *     return html`<slot ${this.#assignedElements.slot()}></slot>`;
 *   }
 * }
 * ```
 */
export function queryAssignedElements(
	options?: QueryAssignedElementsOptions,
): AssignedElementsSignal;
export function queryAssignedElements({
	filter,
	...options
}: QueryAssignedElementsOptions = {}): AssignedElementsSignal {
	const elements = signal<readonly Element[]>([], {equal: areArraysEqual});

	let result: Signal<readonly Element[]>;

	if (filter != null) {
		result = computed(() => elements().filter(filter), {equal: areArraysEqual});
	} else {
		result = elements.asReadonly();
	}

	return Object.assign(result, {slot: () => _queryElements(elements, options)});
}

function areArraysEqual(a: readonly unknown[], b: readonly unknown[]) {
	const aLen = a.length;
	if (b.length !== aLen) {
		return false;
	}

	for (let i = 0; i < aLen; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}
