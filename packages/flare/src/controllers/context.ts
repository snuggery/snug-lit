import {
	ContextConsumer,
	ContextProvider,
	type Context,
	type ContextType,
} from "@lit/context";
import type {ReactiveController, ReactiveControllerHost} from "lit";
import {
	type Signal,
	signal,
	effect,
	untracked,
	isSignal,
	EffectRef,
} from "@snug-lit/flare";

export * from "@lit/context";

export interface ConsumeOptions {
	subscribe?: boolean;
}

export interface ConsumeSignal<T> extends Signal<T | undefined> {
	destroy(): void;
}

export function consume<C extends Context<unknown, unknown>>(
	host: HTMLElement & ReactiveControllerHost,
	context: C,
	options: ConsumeOptions = {},
): ConsumeSignal<ContextType<C>> {
	const value = signal<ContextType<C> | undefined>(undefined);

	const consumer = new ContextConsumer(host, {
		...options,
		context,
		callback(v, dispose) {
			value.set(v);

			if (!options.subscribe) {
				dispose?.();
			}
		},
	});

	const result = value.asReadonly() as ConsumeSignal<ContextType<C>>;
	result.destroy = () => {
		consumer.hostDisconnected?.();
		host.removeController(consumer);
	};

	return result;
}

export interface ProvideRef {
	destroy(): void;
}

export function provide<C extends Context<unknown, unknown>>(
	host: HTMLElement & ReactiveControllerHost,
	context: C,
	value: Signal<ContextType<C>> | ContextType<C>,
): ProvideRef {
	let initialValue, effectRef: EffectRef | undefined;

	if (!isSignal(value)) {
		initialValue = value;
	} else {
		initialValue = untracked(value);
		effectRef = effect(host, () => {
			provider.setValue(value());
		});
	}

	const provider = new ContextProvider(host, {
		context,
		initialValue,
	});

	return {
		destroy() {
			effectRef?.destroy();

			(provider as ReactiveController)?.hostDisconnected?.();
			host.removeController(provider);
		},
	};
}
