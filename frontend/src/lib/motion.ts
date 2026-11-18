import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Action } from 'svelte/action';

const reducedMotion = '(prefers-reduced-motion: reduce)';
let scrollTriggerRegistered = false;

function withMotion(
	setup: (context: gsap.Context) => void | (() => void),
	conditions: Record<string, string> = {}
) {
	if (typeof window === 'undefined') return;

	const media = gsap.matchMedia();
	media.add({ all: 'all', reduced: reducedMotion, ...conditions }, (context) => {
		if (context.conditions?.reduced) return;
		return setup(context);
	});
	return { destroy: () => media.revert() };
}

export const heroIntro: Action<HTMLElement> = (node) =>
	withMotion(() => {
		if (node.getBoundingClientRect().bottom <= 0) return;
		const targets = node.querySelectorAll('[data-hero-intro]');
		if (!targets.length) return;

		gsap.timeline().from(targets, {
			opacity: 0.3,
			y: 12,
			duration: 0.62,
			stagger: 0.09,
			ease: 'power3.out',
			clearProps: 'opacity,transform'
		});
	});

export const revealOnScroll: Action<HTMLElement, 'children' | undefined> = (node, mode) => {
	const revealed = new Set<Element>();
	return withMotion((context) => {
		const targets = mode === 'children' ? Array.from(node.children) : [node];
		const belowViewport = targets.filter((target) =>
			!revealed.has(target) && target.getBoundingClientRect().top >= window.innerHeight
		);
		if (!belowViewport.length) return;

		if (!scrollTriggerRegistered) {
			gsap.registerPlugin(ScrollTrigger);
			scrollTriggerRegistered = true;
		}

		ScrollTrigger.batch(belowViewport, {
			start: 'top bottom+=24',
			once: true,
			onEnter(entering) {
				// Scroll callbacks run outside matchMedia's setup. Track their tweens for cleanup.
				context.add(() => {
					entering.forEach((target) => revealed.add(target));
					gsap.from(entering, {
						opacity: 0.15,
						y: 16,
						duration: 0.55,
						stagger: { amount: Math.min((entering.length - 1) * 0.06, 0.18) },
						ease: 'power3.out',
						clearProps: 'opacity,transform'
					});
				});
			}
		});
	});
};

export const livePulse: Action<HTMLElement> = (ring) =>
	withMotion(() => {
		gsap.fromTo(ring, { scale: 0.9, opacity: 0 }, {
			scale: 1.9,
			opacity: 0.4,
			duration: 0.9,
			ease: 'sine.inOut',
			yoyo: true,
			repeat: -1
		});
	});

export const skeletonShimmer: Action<HTMLElement> = (node) =>
	withMotion(() => {
		gsap.to(node, { backgroundPositionX: '-100%', duration: 1.6, ease: 'none', repeat: -1 });
	});

export const demoFade: Action<HTMLVideoElement, boolean> = (node, ready) => {
	function animate(loaded: boolean) {
		if (!loaded) return;
		return withMotion(() => {
			gsap.from(node, { opacity: 0, duration: 0.5, ease: 'power2.out', clearProps: 'opacity' });
		});
	}

	let motion = animate(ready);
	return {
		update(loaded) {
			motion?.destroy();
			motion = animate(loaded);
		},
		destroy: () => motion?.destroy()
	};
};
