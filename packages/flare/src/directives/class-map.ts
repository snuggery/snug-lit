import {noChange} from "lit";
import {
	AttributePart,
	Directive,
	DirectiveParameters,
	PartInfo,
	PartType,
	directive,
} from "lit/directive.js";

import {
	type EffectRef,
	type Signal,
	isSignal,
	microtaskEffect,
} from "../index.js";

/**
 * A key-value set of class names to truthy values.
 */
export interface ClassInfo {
	readonly [name: string]:
		| string
		| boolean
		| number
		| Signal<string | boolean | number>;
}

class ClassMapDirective extends Directive {
	readonly #staticClasses?: Set<string>;
	readonly #previousClasses = new Map<
		string,
		[Signal<string | boolean | number>, EffectRef] | undefined
	>();

	#firstRender = true;

	constructor(partInfo: PartInfo) {
		super(partInfo);
		if (
			partInfo.type !== PartType.ATTRIBUTE ||
			partInfo.name !== "class" ||
			(partInfo.strings?.length as number) > 2
		) {
			throw new Error(
				"`classMap()` can only be used in the `class` attribute " +
					"and must be the only part in the attribute.",
			);
		}

		if (partInfo.strings !== undefined) {
			this.#staticClasses = new Set(
				partInfo.strings
					.join(" ")
					.split(/\s/)
					.filter((s) => s !== ""),
			);
		}
	}

	render(classInfo: ClassInfo): void;
	render() {
		// unused but required for typing
	}

	override update(part: AttributePart, [classInfo]: DirectiveParameters<this>) {
		const classList = part.element.classList;

		for (const [name, ref] of this.#previousClasses) {
			if (!(name in classInfo)) {
				classList.remove(name);
				this.#previousClasses!.delete(name);
				ref?.[1].destroy();
			}
		}

		for (const name in classInfo) {
			if (this.#staticClasses?.has(name)) {
				continue;
			}

			const value = classInfo[name];
			const previousValue = this.#previousClasses.get(name);

			if (isSignal(value)) {
				if (previousValue?.[0] === value) {
					// Signal itself didn't change
					continue;
				}

				previousValue?.[1].destroy();

				const ref = microtaskEffect(() => {
					classList.toggle(name, !!value());
				});

				this.#previousClasses.set(name, [value, ref]);
			} else {
				previousValue?.[1].destroy();

				if (value) {
					classList.add(name);
					this.#previousClasses.set(name, undefined);
				} else {
					classList.remove(name);
					this.#previousClasses.delete(name);
				}
			}
		}

		if (this.#firstRender) {
			this.#firstRender = false;
			return "";
		}

		return noChange;
	}
}

/**
 * A directive that applies dynamic CSS classes.
 *
 * This must be used in the `class` attribute and must be the only part used in
 * the attribute. It takes each property in the `classInfo` argument and adds
 * the property name to the element's `classList` if the property value is
 * truthy; if the property value is falsy, the property name is removed from
 * the element's `class`.
 *
 * For example `{foo: bar}` applies the class `foo` if the value of `bar` is
 * truthy.
 *
 * @param classInfo
 */
export const classMap = directive(ClassMapDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type {ClassMapDirective};
