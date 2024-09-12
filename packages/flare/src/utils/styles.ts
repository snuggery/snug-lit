import {
	CSSResult,
	CSSResultOrNative,
	LitElement,
	supportsAdoptingStyleSheets,
} from "lit";
import {FlareElement} from "../flare-element";

/**
 * Add the given styles to a style scope
 */
export function adoptStyles(
	scope: ShadowRoot | Document,
	styles: Array<CSSResultOrNative>,
) {
	if (supportsAdoptingStyleSheets) {
		scope.adoptedStyleSheets = styles.map((s) =>
			s instanceof CSSStyleSheet ? s : s.styleSheet!,
		);

		return;
	}

	let container;

	if (scope instanceof ShadowRoot) {
		container = scope;

		const scopeElement = scope.host;
		const renderOptions = (
			scopeElement as Element & Partial<FlareElement | LitElement>
		).renderOptions;

		if (renderOptions && !renderOptions.renderBefore) {
			scope.appendChild((renderOptions.renderBefore = new Comment()));
		}
	} else {
		container = scope.head;
	}

	for (const s of styles) {
		const style = document.createElement("style");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const nonce = (global as any)["litNonce"];
		if (nonce !== undefined) {
			style.setAttribute("nonce", nonce);
		}
		style.textContent = (s as CSSResult).cssText;
		container.appendChild(style);
	}
}
