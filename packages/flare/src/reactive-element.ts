import type {ReactiveController, ReactiveControllerHost} from "lit";

import {scheduler, type SchedulableEffect} from "./scheduler.js";
import {
	consumerAfterComputation,
	consumerBeforeComputation,
	consumerDestroy,
	REACTIVE_NODE,
	type ReactiveNode,
} from "./signals/primitives.js";
import {type Deferred, deferred} from "./utils/deferred.js";

/**
 * Removes the `readonly` modifier from properties in the union K.
 *
 * This is a safer way to cast a value to a type with a mutable version of a
 * readonly field, than casting to an interface with the field re-declared
 * because it preserves the type of all the fields and warns on typos.
 */
export type Mutable<T, K extends keyof T> = Omit<T, K> & {
	-readonly [P in keyof Pick<T, K>]: P extends K ? T[P] : never;
};

export abstract class ReactiveElement
	extends HTMLElement
	implements ReactiveControllerHost
{
	readonly #controllers = new Set<ReactiveController>();

	#node: ReactiveNode | null = null;
	#effect?: SchedulableEffect;

	#updateComplete: Deferred<false> | null = null;

	#ensureNode() {
		if (this.#node) {
			return;
		}

		const node: ReactiveNode = Object.create(REACTIVE_NODE);
		(
			node as Mutable<ReactiveNode, "consumerIsAlwaysLive">
		).consumerIsAlwaysLive = true;
		node.consumerMarkedDirty = () => {
			this.requestUpdate();
		};

		this.#node = node;
	}

	#destroyNode() {
		if (!this.#node) {
			return;
		}

		consumerDestroy(this.#node);
		this.#node = null;
	}

	connectedCallback() {
		this.requestUpdate();

		for (const ctrl of this.#controllers) {
			ctrl.hostConnected?.();
		}
	}

	disconnectedCallback() {
		for (const ctrl of this.#controllers) {
			ctrl.hostDisconnected?.();
		}

		this.#destroyNode();
	}

	addController(controller: ReactiveController): void {
		if (this.#controllers.has(controller)) {
			return;
		}

		this.#controllers.add(controller);

		if (this.isConnected) {
			controller.hostConnected?.();
		}
	}

	removeController(controller: ReactiveController): void {
		this.#controllers.delete(controller);
	}

	requestUpdate(): void {
		// calling scheduleEffect multiple times with the same effect is a no-op, so we don't need to guard
		scheduler.schedule(
			(this.#effect ??= {
				run: () => {
					this.#performUpdate();
				},
			}),
		);
	}

	#performUpdate() {
		for (const ctrl of this.#controllers) {
			ctrl.hostUpdate?.();
		}

		if (this.isConnected && (this.#node == null || this.#node.dirty)) {
			this.#ensureNode();

			// Mark clean so we can track whatever changes after this render
			this.#node!.dirty = false;

			if (this.isConnected) {
				const previousConsumer = consumerBeforeComputation(this.#node);
				let renderResult: unknown;
				try {
					renderResult = this.render();
				} finally {
					consumerAfterComputation(this.#node, previousConsumer);
				}

				this.applyRenderResult(renderResult);
			}
		}

		for (const ctrl of this.#controllers) {
			ctrl.hostUpdated?.();
		}

		if (this.#updateComplete) {
			this.#updateComplete.resolve(false);
			this.#updateComplete = null;
		}
	}

	protected abstract applyRenderResult(result: unknown): void;

	protected abstract render(): unknown;

	get updateComplete(): Promise<boolean> {
		return (this.#updateComplete ??= deferred()).promise;
	}
}
