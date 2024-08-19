import {
	type ComplexAttributeConverter,
	defaultConverter,
	notEqual,
	type PropertyDeclaration,
	type PropertyDeclarations,
} from "lit";

import {signal, type WritableSignal} from "./signals/api/signal.js";
import {computed} from "./signals/api/computed.js";
import {effect} from "./signals/api/effect.js";
import {type Mutable, ReactiveElement} from "./reactive-element.js";

export type Initializer = (element: ReactiveInputElement) => void;

const initializers = new WeakMap<typeof ReactiveInputElement, Initializer[]>();
const attributeToPropertyMap = new WeakMap<
	typeof ReactiveInputElement,
	Map<string, PropertyKey>
>();

const defaultPropertyDeclaration: PropertyDeclaration = {
	attribute: true,
	type: String,
	converter: defaultConverter,
	reflect: false,
	hasChanged: notEqual,
};

export let getSignal: (
	instance: ReactiveInputElement,
	key: PropertyKey,
) => WritableSignal<unknown> | undefined;

export abstract class ReactiveInputElement extends ReactiveElement {
	static {
		getSignal = (instance, key) => instance.#signals.get(key);
	}

	/**
	 * Adds an initializer function to the class that is called during instance
	 * construction.
	 *
	 * This is useful for code that runs against a `ReactiveElement`
	 * subclass, such as a decorator, that needs to do work for each
	 * instance, such as setting up a `ReactiveController`.
	 *
	 * ```ts
	 * const myDecorator = (target: typeof ReactiveElement, key: string) => {
	 *   target.addInitializer((instance: ReactiveElement) => {
	 *     // This is run during construction of the element
	 *     new MyController(instance);
	 *   });
	 * }
	 * ```
	 *
	 * Decorating a field will then cause each instance to run an initializer
	 * that adds a controller:
	 *
	 * ```ts
	 * class MyElement extends LitElement {
	 *   @myDecorator foo;
	 * }
	 * ```
	 *
	 * Initializers are stored per-constructor. Adding an initializer to a
	 * subclass does not add it to a superclass. Since initializers are run in
	 * constructors, initializers will run in order of the class hierarchy,
	 * starting with superclasses and progressing to the instance's class.
	 *
	 * @nocollapse
	 */
	static addInitializer(initializer: Initializer) {
		this.prepare();

		let ownInitializers = initializers.get(this);
		if (!ownInitializers) {
			initializers.set(this, (ownInitializers = []));
		}
		ownInitializers.push(initializer);
	}

	/**
	 * Marks class as having been finalized, which includes creating properties
	 * from `static properties`, but does *not* include all properties created
	 * from decorators.
	 * @nocollapse
	 */
	protected static finalized: true | undefined = true;

	/**
	 * Memoized list of all element properties, including any superclass
	 * properties. Created lazily on user subclasses when finalizing the class.
	 *
	 * @nocollapse
	 * @category properties
	 */
	static elementProperties: Map<PropertyKey, PropertyDeclaration>;

	/**
	 * User-supplied object that maps property names to `PropertyDeclaration`
	 * objects containing options for configuring reactive properties. When
	 * a reactive property is set the element will update and render.
	 *
	 * By default properties are public fields, and as such, they should be
	 * considered as primarily settable by element users, either via attribute or
	 * the property itself.
	 *
	 * Generally, properties that are changed by the element should be private or
	 * protected fields and should use the `state: true` option. Properties
	 * marked as `state` do not reflect from the corresponding attribute
	 *
	 * However, sometimes element code does need to set a public property. This
	 * should typically only be done in response to user interaction, and an event
	 * should be fired informing the user; for example, a checkbox sets its
	 * `checked` property when clicked and fires a `changed` event. Mutating
	 * public properties should typically not be done for non-primitive (object or
	 * array) properties. In other cases when an element needs to manage state, a
	 * private property set with the `state: true` option should be used. When
	 * needed, state properties can be initialized via public properties to
	 * facilitate complex interactions.
	 * @nocollapse
	 * @category properties
	 */
	declare static properties?: PropertyDeclarations;

	/**
	 * Returns a list of attributes corresponding to the registered properties.
	 * @nocollapse
	 * @category attributes
	 */
	static get observedAttributes() {
		// Ensure we've created all properties
		this.finalize();

		const ownAttributeToPropertyMap = attributeToPropertyMap.get(this);
		return ownAttributeToPropertyMap && [...ownAttributeToPropertyMap.keys()];
	}

	/**
	 * Creates a property accessor on the element prototype if one does not exist
	 * and stores a {@linkcode PropertyDeclaration} for the property with the
	 * given options. The property setter calls the property's `hasChanged`
	 * property option or uses a strict identity check to determine whether or not
	 * to request an update.
	 *
	 * This method may be overridden to customize properties; however,
	 * when doing so, it's important to call `super.createProperty` to ensure
	 * the property is setup correctly. This method calls
	 * `getPropertyDescriptor` internally to get a descriptor to install.
	 * To customize what properties do when they are get or set, override
	 * `getPropertyDescriptor`. To customize the options for a property,
	 * implement `createProperty` like this:
	 *
	 * ```ts
	 * static createProperty(name, options) {
	 *   options = Object.assign(options, {myOption: true});
	 *   super.createProperty(name, options);
	 * }
	 * ```
	 *
	 * @nocollapse
	 * @category properties
	 */
	static createProperty(
		name: PropertyKey,
		options: PropertyDeclaration = defaultPropertyDeclaration,
	) {
		// If this is a state property, force the attribute to false.
		if (options.state) {
			(options as Mutable<PropertyDeclaration, "attribute">).attribute = false;
		}
		this.prepare();
		this.elementProperties.set(name, options);
		if (!options.noAccessor) {
			const descriptor = this.getPropertyDescriptor(name, options);
			if (descriptor !== undefined) {
				Reflect.defineProperty(this.prototype, name, descriptor);
			}
		}
	}

	/**
	 * Returns a property descriptor to be defined on the given named property.
	 * If no descriptor is returned, the property will not become an accessor.
	 * For example,
	 *
	 * ```ts
	 * class MyElement extends LitElement {
	 *   static getPropertyDescriptor(name, key, options) {
	 *     const defaultDescriptor =
	 *         super.getPropertyDescriptor(name, key, options);
	 *     const setter = defaultDescriptor.set;
	 *     return {
	 *       get: defaultDescriptor.get,
	 *       set(value) {
	 *         setter.call(this, value);
	 *         // custom action.
	 *       },
	 *       configurable: true,
	 *       enumerable: true
	 *     }
	 *   }
	 * }
	 * ```
	 *
	 * @nocollapse
	 * @category properties
	 */
	protected static getPropertyDescriptor(
		name: PropertyKey,
		options: PropertyDeclaration,
	): PropertyDescriptor | undefined;
	protected static getPropertyDescriptor(
		name: PropertyKey,
	): PropertyDescriptor | undefined {
		const {
			get,
			set,
			enumerable = true,
			configurable = true,
		} = Reflect.getOwnPropertyDescriptor(this.prototype, name) ?? {};

		if (get != null || set != null) {
			// Hmmkay, get/set pair, we don't like this but we can try to work with it
			return {
				get:
					get &&
					function (this: ReactiveInputElement) {
						const signal = getSignal(this, name);
						signal?.();
						return get.call(this);
					},
				set:
					set &&
					function (this: ReactiveInputElement, value: unknown) {
						const signal = getSignal(this, name);
						signal?.set(value);
						set.call(this, value);
					},
				configurable,
				enumerable,
			};
		}

		return {
			get(this: ReactiveInputElement) {
				const signal = getSignal(this, name);
				return signal!();
			},
			set(this: ReactiveInputElement, value: unknown) {
				const signal = getSignal(this, name);
				signal!.set(value);
			},
			configurable,
			enumerable,
		};
	}

	/**
	 * Returns the property options associated with the given property.
	 * These options are defined with a `PropertyDeclaration` via the `properties`
	 * object or the `@property` decorator and are registered in
	 * `createProperty(...)`.
	 *
	 * Note, this method should be considered "final" and not overridden. To
	 * customize the options for a given property, override
	 * {@linkcode createProperty}.
	 *
	 * @nocollapse
	 * @final
	 * @category properties
	 */
	static getPropertyOptions(name: PropertyKey) {
		return this.elementProperties.get(name) ?? defaultPropertyDeclaration;
	}

	/**
	 * Initializes static own properties of the class used in bookkeeping
	 * for element properties, initializers, etc.
	 *
	 * Can be called multiple times by code that needs to ensure these
	 * properties exist before using them.
	 *
	 * This method ensures the superclass is finalized so that inherited
	 * property metadata can be copied down.
	 * @nocollapse
	 */
	protected static prepare() {
		if (this.hasOwnProperty("elementProperties")) {
			// Already prepared
			return;
		}

		// Finalize any superclasses
		const superCtor = Reflect.getPrototypeOf(
			this,
		) as typeof ReactiveInputElement;
		superCtor.finalize();

		// Create own set of initializers for this class if any exist on the
		// superclass and copy them down. Note, for a small perf boost, avoid
		// creating initializers unless needed.
		const superInitializers = initializers.get(superCtor);
		if (superInitializers !== undefined) {
			initializers.set(this, [...superInitializers]);
		}

		// Initialize elementProperties from the superclass
		this.elementProperties = new Map(superCtor.elementProperties);
	}

	/**
	 * Finishes setting up the class so that it's ready to be registered
	 * as a custom element and instantiated.
	 *
	 * This method is called by the ReactiveElement.observedAttributes getter.
	 * If you override the observedAttributes getter, you must either call
	 * super.observedAttributes to trigger finalization, or call finalize()
	 * yourself.
	 *
	 * @nocollapse
	 */
	protected static finalize() {
		if (this.finalized) {
			return;
		}
		this.finalized = true;
		this.prepare();

		// Create properties from the static properties block:
		if (this.properties) {
			const props = this.properties;
			for (const p of Object.keys(props)) {
				this.createProperty(p, props[p]);
			}
		}

		// Create properties from standard decorator metadata:
		const metadata = (this as any)[Symbol.metadata] as unknown;
		if (metadata != null) {
			const properties = litPropertyMetadata.get(metadata);
			if (properties !== undefined) {
				for (const [p, options] of properties) {
					this.elementProperties.set(p, options);
				}
			}
		}

		// Create the attribute-to-property map
		const ownAttributeToPropertyMap = new Map<string, PropertyKey>();
		attributeToPropertyMap.set(this, ownAttributeToPropertyMap);
		for (const [p, options] of this.elementProperties) {
			const attr = attributeNameForProperty(p, options);
			if (attr !== undefined) {
				ownAttributeToPropertyMap.set(attr, p);
			}
		}
	}

	#signals = new Map<PropertyKey, WritableSignal<unknown>>();

	#reflectingProperty: PropertyKey | null = null;

	constructor() {
		super();

		const ownKeys = new Set<PropertyKey>(Reflect.ownKeys(this));

		const ownInitializers = initializers.get(
			this.constructor as typeof ReactiveInputElement,
		);
		if (ownInitializers) {
			for (const initializer of ownInitializers) {
				initializer(this);
			}
		}

		for (const [key, prop] of (this.constructor as typeof ReactiveInputElement)
			.elementProperties) {
			let defaultValue: unknown;

			if (ownKeys.has(key)) {
				defaultValue = this[key as keyof this];
			}

			delete this[key as keyof this];

			const propSignal = signal(defaultValue, {
				equal: prop.hasChanged && not(prop.hasChanged),
			});

			this.#signals.set(key, propSignal);

			const attr = attributeNameForProperty(key, prop);
			if (attr != null && prop.reflect) {
				const converter =
					(prop.converter as ComplexAttributeConverter)?.toAttribute !==
					undefined
						? (prop.converter as ComplexAttributeConverter)
						: defaultConverter;

				const attributeValue = computed(() =>
					converter.toAttribute!(propSignal()),
				);

				effect(
					() => {
						const attrVal = attributeValue() as string | null | undefined;

						this.#reflectingProperty = key;
						if (attrVal == null) {
							this.removeAttribute(attr);
						} else {
							this.setAttribute(attr, attrVal);
						}
						this.#reflectingProperty = null;
					},
					{host: this},
				);
			}
		}
	}

	attributeChangedCallback(
		name: string,
		_old: string | null,
		value: string | null,
	) {
		const property = attributeToPropertyMap
			.get(this.constructor as typeof ReactiveInputElement)!
			.get(name);

		if (property != null && property !== this.#reflectingProperty) {
			const options = (
				this.constructor as typeof ReactiveInputElement
			).getPropertyOptions(property);

			const converter =
				typeof options.converter === "function"
					? {fromAttribute: options.converter}
					: options.converter?.fromAttribute !== undefined
						? options.converter
						: defaultConverter;

			this.#signals
				.get(property)
				?.set(converter.fromAttribute!(value, options.type));
		}
	}
}

function not(fn: (a: unknown, b: unknown) => boolean): typeof fn {
	return (a, b) => !fn(a, b);
}

function attributeNameForProperty(
	name: PropertyKey,
	options: PropertyDeclaration,
) {
	const attribute = options.attribute;
	return attribute === false
		? undefined
		: typeof attribute === "string"
			? attribute
			: typeof name === "string"
				? name.toLowerCase()
				: undefined;
}
