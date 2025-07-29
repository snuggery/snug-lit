/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export {type ComputedNode, createComputed} from "./primitives/computed.js";
export {type ValueEqualityFn, defaultEquals} from "./primitives/equality.js";
export {setThrowInvalidWriteToSignalError} from "./primitives/errors.js";
export {
	REACTIVE_NODE,
	type Reactive,
	type ReactiveNode,
	SIGNAL,
	consumerAfterComputation,
	consumerBeforeComputation,
	consumerDestroy,
	consumerMarkDirty,
	consumerPollProducersForChange,
	getActiveConsumer,
	isInNotificationPhase,
	isReactive,
	producerAccessed,
	producerIncrementEpoch,
	producerMarkClean,
	producerNotifyConsumers,
	producerUpdateValueVersion,
	producerUpdatesAllowed,
	setActiveConsumer,
} from "./primitives/graph.js";
export {
	LINKED_SIGNAL_NODE,
	type ComputationFn,
	type LinkedSignalGetter,
	type LinkedSignalNode,
	createLinkedSignal,
	linkedSignalSetFn,
	linkedSignalUpdateFn,
} from "./primitives/linked-signal.js";
export {
	SIGNAL_NODE,
	type SignalGetter,
	type SignalNode,
	createSignal,
	runPostSignalSetFn,
	setPostSignalSetFn,
	signalSetFn,
	signalUpdateFn,
} from "./primitives/signal.js";
export {
	type Watch,
	type WatchCleanupFn,
	type WatchCleanupRegisterFn,
	createWatch,
} from "./primitives/watch.js";
