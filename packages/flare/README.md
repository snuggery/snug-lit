# @snug-lit/flare

Lit-like custom elements with Angular-like signals

## Custom elements

This package exposes two base classes for custom elements.
The `FlareElement` is much like lit's `LitElement`, while the `OpenFlareElement` is a custom element class that doesn't use [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM).

The API of these two elements is more or less identical to `LitElement`, but the underlying implementation is quite different.
Where lit uses a system of propery getters/setters that track modification directly in each and every `LitElement`, flare uses signals under the hood.
Any flare signals used inside `render()` of a flare element will automatically trigger a re-render whenever the signal value changes.
This differs from lit, which uses properties with `state: true` and a `requestUpdate()` function to trigger re-renders.
The `requestUpdate()` function exists in flare as well, though its use should be limited if signals are used everywhere.

## Signals

The signal implementation of this package was borrowed from Angular and updated to match a non-Angular environment.
The following APIs are supported:

- `signal`
- `computed`
- `linkedSignal`
- `isSignal`
- `untracked`
- `afterRender` and `afterNextRender`

Angular's `effect` is split into two different versions:

- `effect` requires a `ReactiveControllerHost` and ties the handling of the effect function to the host's `requestUpdate` function. When used with a `FlareElement` or `OpenFlareElement` instance, this alignes the timing of the effect neatly with any changes to signals that trigger a re-render.
- `microtaskEffect` doesn't require a `ReactiveControllerHost`, it runs the effect function asynchronously without tying into any component's rendering.

### Interop with Angular

Flare's elements do not interoperate with Angular's signals, even though the APIs are very similar.
Using an Angular signal within a flare `computed()` will not re-run the computation whenever the signal changes, and vice versa.

Interop with Angular signals is a non-goal for this project.
We eagerly await the TC39 signals propsal though, which would make it possible for all signal libraries to interoperate perfectly.
