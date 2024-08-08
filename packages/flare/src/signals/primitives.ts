/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {ComputedNode, createComputed} from "./primitives/computed.js";
export {ValueEqualityFn, defaultEquals} from "./primitives/equality.js";
export {setThrowInvalidWriteToSignalError} from "./primitives/errors.js";
export {
	REACTIVE_NODE,
	Reactive,
	ReactiveNode,
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
	producerNotifyConsumers,
	producerUpdateValueVersion,
	producerUpdatesAllowed,
	setActiveConsumer,
} from "./primitives/graph.js";
export {
	SIGNAL_NODE,
	SignalGetter,
	SignalNode,
	createSignal,
	runPostSignalSetFn,
	setPostSignalSetFn,
	signalSetFn,
	signalUpdateFn,
} from "./primitives/signal.js";
export {
	Watch,
	WatchCleanupFn,
	WatchCleanupRegisterFn,
	createWatch,
} from "./primitives/watch.js";
