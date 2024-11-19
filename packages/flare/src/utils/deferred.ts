export interface Deferred<T> {
	promise: Promise<T>;

	resolve: (value: T | PromiseLike<T>) => void;
	reject: (error: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
	let resolve: (value: T | PromiseLike<T>) => void;
	let reject: (error: unknown) => void;

	let promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {promise, resolve: resolve!, reject: reject!};
}
