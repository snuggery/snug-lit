import {
	adoptStyles,
	CSSResultGroup,
	CSSResultOrNative,
	getCompatibleStyle,
	nothing,
	render,
	RenderOptions,
} from "lit";

import {ReactiveInputElement} from "./reactive-input-element.js";

export abstract class FlareElement extends ReactiveInputElement {
	static get shadowRootOptions(): ShadowRootInit {
		return {mode: "open"};
	}

	/**
	 * Memoized list of all element styles.
	 * Created lazily on user subclasses when finalizing the class.
	 * @nocollapse
	 * @category styles
	 */
	static elementStyles: Array<CSSResultOrNative> = [];

	/**
	 * Array of styles to apply to the element. The styles should be defined
	 * using the {@linkcode css} tag function, via constructible stylesheets, or
	 * imported from native CSS module scripts.
	 *
	 * Note on Content Security Policy:
	 *
	 * Element styles are implemented with `<style>` tags when the browser doesn't
	 * support adopted StyleSheets. To use such `<style>` tags with the style-src
	 * CSP directive, the style-src value must either include 'unsafe-inline' or
	 * `nonce-<base64-value>` with `<base64-value>` replaced be a server-generated
	 * nonce.
	 *
	 * To provide a nonce to use on generated `<style>` elements, set
	 * `window.litNonce` to a server-generated nonce in your page's HTML, before
	 * loading application code:
	 *
	 * ```html
	 * <script>
	 *   // Generated and unique per request:
	 *   window.litNonce = 'a1b2c3d4';
	 * </script>
	 * ```
	 * @nocollapse
	 * @category styles
	 */
	static styles?: CSSResultGroup;

	protected static override finalize(): void {
		super.finalize();

		this.elementStyles = finalizeStyles(this.styles);
	}

	#renderRoot?: HTMLElement | ShadowRoot;

	readonly #renderOptions: RenderOptions = {
		host: this,
	};

	override connectedCallback(): void {
		this.#renderOptions.isConnected = true;

		super.connectedCallback();
	}

	protected createRenderRoot(): HTMLElement | ShadowRoot {
		const renderRoot = this.attachShadow(
			(this.constructor as typeof FlareElement).shadowRootOptions,
		);

		adoptStyles(
			renderRoot,
			(this.constructor as typeof FlareElement).elementStyles,
		);

		// adoptStyles might have added style elements to the renderRoot, render any
		// content before that
		this.#renderOptions.renderBefore = renderRoot.firstChild;

		return renderRoot;
	}

	protected override applyRenderResult(result: unknown): void {
		render(
			result,
			(this.#renderRoot ??= this.createRenderRoot()),
			this.#renderOptions,
		);
	}

	protected override render(): unknown {
		return nothing;
	}
}

function finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
	const elementStyles: CSSResultOrNative[] = [];
	if (Array.isArray(styles)) {
		// Dedupe the flattened array in reverse order to preserve the last items.
		// Casting to Array<unknown> works around TS error that
		// appears to come from trying to flatten a type CSSResultArray.
		const set = new Set((styles as unknown[]).flat(Infinity).reverse());
		// Then preserve original order by adding the set items in reverse order.
		for (const s of set) {
			elementStyles.unshift(getCompatibleStyle(s as CSSResultOrNative));
		}
	} else if (styles !== undefined) {
		elementStyles.push(getCompatibleStyle(styles));
	}
	return elementStyles;
}
