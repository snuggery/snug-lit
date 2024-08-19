import {ReactiveController, ReactiveControllerHost} from "lit";

import {destroyReactiveController} from "../utils/destroyable.js";

export interface ListenOptions extends AddEventListenerOptions {
	host?: ReactiveControllerHost;
}

export interface ListenOptionsWithHost extends AddEventListenerOptions {
	host: ReactiveControllerHost;
}

export function listen<
	E extends HTMLElement & ReactiveControllerHost,
	K extends keyof HTMLElementEventMap,
>(
	element: E,
	type: K,
	listener: (this: E, event: HTMLElementEventMap[K]) => void,
	options?: ListenOptions,
): ReactiveController;
export function listen<
	E extends HTMLElement,
	K extends keyof HTMLElementEventMap,
>(
	element: E,
	type: K,
	listener: (this: E, event: HTMLElementEventMap[K]) => void,
	options: ListenOptionsWithHost,
): ReactiveController;
export function listen<K extends keyof DocumentEventMap>(
	document: Document,
	type: K,
	listener: (this: Document, event: DocumentEventMap[K]) => void,
	options: ListenOptionsWithHost,
): ReactiveController;
export function listen<K extends keyof WindowEventMap>(
	window: Window,
	type: K,
	listener: (this: Window, event: WindowEventMap[K]) => void,
	options: ListenOptionsWithHost,
): ReactiveController;
export function listen<T extends EventTarget & ReactiveControllerHost>(
	target: T,
	type: string,
	listener: ((this: T, event: Event) => void) | EventListenerObject,
	options?: ListenOptions,
): ReactiveController;
export function listen<T extends EventTarget>(
	target: T,
	type: string,
	listener: ((this: T, event: Event) => void) | EventListenerObject,
	options: ListenOptionsWithHost,
): ReactiveController;
export function listen<T extends EventTarget>(
	target: T,
	type: string,
	listener: ((this: T, event: Event) => void) | EventListenerObject,
	{
		host = target as unknown as ReactiveControllerHost,
		...options
	}: ListenOptions = {},
): ReactiveController {
	let actualListener = listener;

	if (options.once) {
		actualListener = function (this: T, event: Event) {
			destroyReactiveController(host, controller);

			if (typeof listener === "function") {
				listener.call(this, event);
			} else {
				listener.handleEvent(event);
			}
		};
	}

	const controller: ReactiveController = {
		hostConnected() {
			target.addEventListener(type, actualListener, options);
		},

		hostDisconnected() {
			target.removeEventListener(type, actualListener, options);
		},
	};

	host.addController(controller);

	return controller;
}
