import type {ReactiveController, ReactiveControllerHost} from "lit";

export interface Destroyable {
	destroy(): void;
}

export function makeDestroyable<T extends object>(
	value: T,
	destroy: () => void,
): T & Destroyable {
	return Object.assign(value, {destroy});
}

export function destroyReactiveController(
	host: ReactiveControllerHost,
	controller: ReactiveController,
) {
	controller.hostDisconnected?.();
	host.removeController(controller);
}
