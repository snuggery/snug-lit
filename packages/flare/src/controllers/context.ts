import {
	ContextConsumer,
	ContextProvider,
	type Context,
	type ContextType,
} from "@lit/context";
import type {ReactiveControllerHost} from "lit";
import {
	type Signal,
	signal,
	effect,
	untracked,
	isSignal,
	EffectRef,
} from "@snug-lit/flare";

import {
	type Destroyable,
	destroyReactiveController,
	makeDestroyable,
} from "../utils/destroyable";

export * from "@lit/context";

export interface ConsumeOptions {
	subscribe?: boolean;
}

export function consume<C extends Context<unknown, unknown>>(
	host: HTMLElement & ReactiveControllerHost,
	context: C,
	options: ConsumeOptions,
): Signal<ContextType<C> | undefined> & Destroyable {
	const result = signal<ContextType<C> | undefined>(undefined);

	const consumer = new ContextConsumer(host, {
		...options,
		context,
		callback(value, dispose) {
			result.set(value);

			if (!options.subscribe) {
				dispose?.();
			}
		},
	});

	return makeDestroyable(result.asReadonly(), () =>
		destroyReactiveController(host, consumer),
	);
}

export function provide<C extends Context<unknown, unknown>>(
	host: HTMLElement & ReactiveControllerHost,
	context: C,
	value: Signal<ContextType<C>> | ContextType<C>,
): Destroyable {
	let initialValue, effectRef: EffectRef | undefined;

	if (!isSignal(value)) {
		initialValue = value;
	} else {
		initialValue = untracked(value);
		effectRef = effect(
			() => {
				provider.setValue(value());
			},
			{host},
		);
	}

	const provider = new ContextProvider(host, {
		context,
		initialValue,
	});

	return {
		destroy() {
			effectRef?.destroy();
			destroyReactiveController(host, provider);
		},
	};
}
