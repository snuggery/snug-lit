import {FlareElement} from "./flare-element.js";
import {adoptStyles} from "./utils/styles.js";

const allStyleInsertedHosts = new Map<
	Function,
	WeakSet<Document | ShadowRoot>
>();

/**
 * Base element class that manages element properties and attributes, and
 * renders a lit-html template, without using a shadow root.
 *
 * To define a component, subclass `OpenFlareElement` and implement a
 * `render` method to provide the component's template. Define properties
 * using the {@linkcode ReactiveInputElement.properties properties} property or the
 * {@linkcode property} decorator.
 *
 * This element doesn't create a shadow root. It is up to the subclass to ensure
 * that its styles are scoped properly and if the element interacts with the DOM
 * it should take special care with user-provided child elements.
 */
export abstract class OpenFlareElement extends FlareElement {
	protected override createRenderRoot(): HTMLElement {
		return this;
	}

	override connectedCallback(): void {
		super.connectedCallback();

		let styleInsertedHosts = allStyleInsertedHosts.get(this.constructor);
		if (styleInsertedHosts == null) {
			styleInsertedHosts = new WeakSet();
			allStyleInsertedHosts.set(this.constructor, styleInsertedHosts);
		}

		const host = this.getRootNode() as ShadowRoot | Document;
		if (!styleInsertedHosts.has(host)) {
			styleInsertedHosts.add(host);

			adoptStyles(
				host,
				(this.constructor as typeof OpenFlareElement).elementStyles,
			);
		}
	}
}
