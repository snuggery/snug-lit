import {PropertyDeclaration, defaultConverter, notEqual} from "lit";

import {ReactiveInputElement, getSignal} from "../../reactive-input-element.js";

export * from "lit/decorators/property.js";

type Interface<T> = {
	[P in keyof T]: T[P];
};

function legacyProperty(
	options: PropertyDeclaration | undefined,
	proto: Object,
	name: PropertyKey,
) {
	const hasOwnProperty = proto.hasOwnProperty(name);

	(proto.constructor as typeof ReactiveInputElement).createProperty(
		name,
		options,
	);

	// For accessors (which have a descriptor on the prototype) we need to
	// return a descriptor, otherwise TypeScript overwrites the descriptor we
	// define in createProperty() with the original descriptor. We don't do this
	// for fields, which don't have a descriptor, because this could overwrite
	// descriptor defined by other decorators.
	return hasOwnProperty
		? Object.getOwnPropertyDescriptor(proto, name)
		: undefined;
}

// This is duplicated from a similar variable in reactive-element.ts, but
// actually makes sense to have this default defined with the decorator, so
// that different decorators could have different defaults.
const defaultPropertyDeclaration: PropertyDeclaration = {
	attribute: true,
	type: String,
	converter: defaultConverter,
	reflect: false,
	hasChanged: notEqual,
};

/**
 * Wraps a class accessor or setter so that `requestUpdate()` is called with the
 * property name and old value when the accessor is set.
 */
export function standardProperty<C extends Interface<ReactiveInputElement>, V>(
	options: PropertyDeclaration = defaultPropertyDeclaration,
	target: ClassAccessorDecoratorTarget<C, V>,
	context: ClassAccessorDecoratorContext<C, V>,
): ClassAccessorDecoratorResult<C, V> {
	const {kind, metadata} = context;

	// Store the property options
	let properties = globalThis.litPropertyMetadata.get(metadata);
	if (properties === undefined) {
		globalThis.litPropertyMetadata.set(metadata, (properties = new Map()));
	}
	properties.set(context.name, options);

	if (kind === "accessor") {
		// Standard decorators cannot dynamically modify the class, so we can't
		// replace a field with accessors. The user must use the new `accessor`
		// keyword instead.
		const {name} = context;
		const {get, set} = target;

		return {
			get(this: ReactiveInputElement) {
				const signal = getSignal(this, name);
				signal?.();
				return get.call(this as unknown as C);
			},
			set(this: ReactiveInputElement, value: V) {
				const signal = getSignal(this, name);
				signal?.set(value);
				set.call(this as unknown as C, value);
			},
			init(this: ReactiveInputElement, v: V): V {
				const signal = getSignal(this, name);
				signal?.set(v);

				return v;
			},
		} as unknown as ClassAccessorDecoratorResult<C, V>;
	}

	throw new Error(`Unsupported decorator location: ${kind}`);
}

/**
 * A class field or accessor decorator which creates a reactive property that
 * reflects a corresponding attribute value. When a decorated property is set
 * the element will update and render. A {@linkcode PropertyDeclaration} may
 * optionally be supplied to configure property features.
 *
 * This decorator should only be used for public fields. As public fields,
 * properties should be considered as primarily settable by element users,
 * either via attribute or the property itself.
 *
 * Generally, properties that are changed by the element should be private or
 * protected fields and should use the {@linkcode state} decorator.
 *
 * However, sometimes element code does need to set a public property. This
 * should typically only be done in response to user interaction, and an event
 * should be fired informing the user; for example, a checkbox sets its
 * `checked` property when clicked and fires a `changed` event. Mutating public
 * properties should typically not be done for non-primitive (object or array)
 * properties. In other cases when an element needs to manage state, a private
 * property decorated via the {@linkcode state} decorator should be used. When
 * needed, state properties can be initialized via public properties to
 * facilitate complex interactions.
 *
 * ```ts
 * class MyElement {
 *   @property({ type: Boolean })
 *   clicked = false;
 * }
 * ```
 * @category Decorator
 * @ExportDecoratedItems
 */
export function property(options?: PropertyDeclaration): PropertyDecorator {
	return <C extends Interface<ReactiveInputElement>, V>(
		protoOrTarget: object | ClassAccessorDecoratorTarget<C, V>,
		nameOrContext: PropertyKey | ClassAccessorDecoratorContext<C, V>,
	) => {
		return typeof nameOrContext === "object"
			? standardProperty<C, V>(
					options,
					protoOrTarget as ClassAccessorDecoratorTarget<C, V>,
					nameOrContext as ClassAccessorDecoratorContext<C, V>,
				)
			: legacyProperty(
					options,
					protoOrTarget as Object,
					nameOrContext as PropertyKey,
				);
	};
}
