import { afterEach, describe, expect, it, vi } from 'vitest';
import { livePulse, revealOnScroll } from '../lib/motion.js';

afterEach(() => vi.restoreAllMocks());

describe('livePulse', () => {
	it('restores the original inline styles when destroyed', () => {
		const dot = document.createElement('span');
		dot.style.opacity = '0.2';
		const pulse = livePulse(dot);

		try {
			expect(dot.style.opacity).toBe('0');
			expect(dot.style.transform).toContain('scale(0.9');
		} finally {
			pulse?.destroy?.();
		}

		expect(dot.style.opacity).toBe('0.2');
		expect(dot.style.transform).toBe('');
	});

	it('leaves the dot static when reduced motion is requested', () => {
		const matchMedia = window.matchMedia.bind(window);
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			...matchMedia(query),
			matches: query === '(prefers-reduced-motion: reduce)'
		}));

		const dot = document.createElement('span');
		const pulse = livePulse(dot);

		try {
			expect(dot.style.opacity).toBe('');
			expect(dot.style.transform).toBe('');
		} finally {
			pulse?.destroy?.();
		}
	});
});

it('leaves scroll reveals visible before entry and restores them on cleanup', async () => {
	vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
	let scroll = 0;
	vi.spyOn(window, 'pageYOffset', 'get').mockImplementation(() => scroll);

	const card = document.createElement('article');
	const top = window.innerHeight + 200;
	vi.spyOn(card, 'getBoundingClientRect').mockImplementation(
		() => new DOMRect(0, top - scroll, 300, 100)
	);
	document.body.append(card);
	const reveal = revealOnScroll(card);

	try {
		expect(card.style.opacity).toBe('');
		scroll = 210;
		document.dispatchEvent(new Event('scroll'));
		await vi.waitFor(() => {
			expect(Number(card.style.opacity)).toBeGreaterThan(0);
			expect(Number(card.style.opacity)).toBeLessThan(1);
		});
	} finally {
		reveal?.destroy?.();
		card.remove();
	}

	expect(card.style.opacity).toBe('');
	expect(card.style.transform).toBe('');
});
