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
 * A key-value set of CSS properties and values.
 *
 * The key should be either a valid CSS property name string, like
 * `'background-color'`, or a valid JavaScript camel case property name
 * for CSSStyleDeclaration like `backgroundColor`.
 */
export interface StyleInfo {
	readonly [name: string]:
		| string
		| number
		| undefined
		| null
		| Signal<string | number | undefined | null>;
}

const important = "important";
// The leading space is important
const importantFlag = " !" + important;
// How many characters to remove from a value, as a negative number
const flagTrim = 0 - importantFlag.length;

class StyleMapDirective extends Directive {
	readonly #previousProperties = new Map<
		string,
		[Signal<string | number | undefined | null>, EffectRef] | undefined
	>();

	#firstRender = true;

	constructor(partInfo: PartInfo) {
		super(partInfo);
		if (
			partInfo.type !== PartType.ATTRIBUTE ||
			partInfo.name !== "style" ||
			(partInfo.strings?.length as number) > 2
		) {
			throw new Error(
				"`styleMap()` can only be used in the `style` attribute " +
					"and must be the only part in the attribute.",
			);
		}
	}

	render(styleInfo: StyleInfo): void;
	render() {
		// unused but required for typing
	}

	override update(part: AttributePart, [styleInfo]: DirectiveParameters<this>) {
		const style = part.element.style;

		for (const [name, ref] of this.#previousProperties) {
			if (!(name in styleInfo)) {
				if (name.includes("-")) {
					style.removeProperty(name);
				} else {
					(style as any)[name] = null;
				}

				this.#previousProperties!.delete(name);
				ref?.[1].destroy();
			}
		}

		for (const name in styleInfo) {
			const value = styleInfo[name];
			const previousValue = this.#previousProperties.get(name);

			if (isSignal(value)) {
				if (previousValue?.[0] === value) {
					// Signal itself didn't change
					continue;
				}

				previousValue?.[1].destroy();

				const ref = microtaskEffect(() => {
					const currentValue = value();
					const isImportant =
						typeof currentValue === "string" &&
						currentValue.endsWith(importantFlag);
					if (name.includes("-") || isImportant) {
						if (currentValue == null) {
							style.removeProperty(name);
						} else {
							style.setProperty(
								name,
								isImportant
									? (currentValue as string).slice(0, flagTrim)
									: (currentValue as string),
								isImportant ? important : "",
							);
						}
					} else {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(style as any)[name] = currentValue;
					}
				});

				this.#previousProperties.set(name, [value, ref]);
			} else if (value != null) {
				this.#previousProperties.set(name, undefined);

				const isImportant =
					typeof value === "string" && value.endsWith(importantFlag);
				if (name.includes("-") || isImportant) {
					style.setProperty(
						name,
						isImportant
							? (value as string).slice(0, flagTrim)
							: (value as string),
						isImportant ? important : "",
					);
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(style as any)[name] = value;
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
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the
 * {@link StyleInfo styleInfo} object and adds the properties to the inline
 * style of the element.
 *
 * Property names with dashes (`-`) are assumed to be valid CSS
 * property names and set on the element's style object using `setProperty()`.
 * Names without dashes are assumed to be camelCased JavaScript property names
 * and set on the element's style object using property assignment, allowing the
 * style object to translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo
 */
export const styleMap = directive(StyleMapDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type {StyleMapDirective};
