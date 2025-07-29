# Project history

This project started as a small thought experiment: what if we take lit's web component API and Angular's signals and smash the two together?

## Angular signals

I'd been using Angular signals for a bit at work when I created this repo, and I loved the ease with which signals track dependencies across boundaries that would typically be hard to traverse: the amount of RxJs observable subscriptions we've been able to replace with Signals is enormous.

```ts
class OldCode {
	value: string;
	valueReverse: string;

	constructor() {
		const cdr = inject(ChangeDetectorRef);
		inject(SomeService)
			.value.pipe(takeUntilDestroyed())
			.subscribe((value) => {
				this.value = value;
				this.valueReverse = value.split("").reverse().join("");
				cdr.markForCheck();
			});
	}
}

class NewCode {
	value: Signal<string> = inject(SomeService).value;
	valueReverse = computed(() => this.value().split("").reverse().join(""));
}
```

It's a very silly example, but it shows scenarios where Angular's `async` pipe doesn't work well unless you add in a few extra operators like `share()`.

I especially find `Signal` to be a better representation of reactive state: a signal has a current value and it notifies you whenever values change.
That's different from RxJs's `Observable`, which is a stream of zero or more values.
Don't get me wrong, I have loved `Observables` for handling streams of data (e.g. events), but its API has always been a hurdle for reactive state:

- There's no way to get the current value without subscribing to all changes
- Subscribing can trigger side-effects
- There's absolutely no guarantee you'll get a value synchronously, the observable might even never emit a value

I've personally started using `Signal` whenever I encounter a property that describes a state, and `Observable` whenever I enounter a property that describes changes / events.

## Lit

At the time I was writing this, we were looking at moving part of our Angular component library to web components.
I'll skip the boring details like "why?" and "how?", but while working on replacing a few components the following thought crossed my mind multiple times: "this would've been easier with signals".
This time the alternative wasn't "use observables" but "use browser events", which comes with more boilerplate than observables.

So I created an experiment: what happens if rip out Lit's reactivity and toss in Angular's signal system instead? \
Enter: Flare, named thusly because a flare is a type of signal that is lit during use.

## Aside: why Angular signals?

You might be wondering why Angular signals?
That's a valid question.
I looked at multiple signal implementations, and even created a proof of concept using Preact's signal library.
It just turned out that I liked Angular's API the best.

## Evolution

That was almost the end of the road for this project: an experiment, a proof of concept.
Until, that is, months later, my colleagues and I were working on web components and we really came across many use cases where signals just happen to be a perfect fit. \
Thankfully I remembered this experiment, and we immediately plugged it in to replace some of our `LitElement` components.
This was received well, and flare got updated to e.g. improve `effect` so it ties into the component rendering while the alternative `microtaskEffect` can be used outside of components.
The biggest addition is something we found lacking in lit: `OpenFlareElement`, a base class for web components that don't use Shadow DOM.
Sure we could've looked for non-lit solutions, but we didn't want a totally different solution for the few non-Shadow DOM web components in our project.
The `OpenFlareElement` uses lit's `html` function and allows the element to define styles, though scoping the styles correctly is left up to the element itself.

## Status

So, at the time of writing, we're using flare in our web component library.
We've still got a few `LitElement` classes in there, though that's nothing flare couldn't handle if we ever put in the effort to refactor these components.
