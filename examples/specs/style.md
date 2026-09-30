# Skelp Styleguide

Skelp apps are minimalist, rounded, calm, and functional. Use a green accent and as few separate surfaces as possible.

## Tokens

```css
:root {
	--bg: #f5f7f6;
	--bg-tertiary: #edf1ef;
	--surface: #ffffff;
	--surface-hover: #edf4f1;
	--border: #dbe2df;
	--text: #1d2824;
	--text-muted: #718078;
	--accent: #147a68;
	--accent-dim: #0f6254;
	--radius: 12px;
	--radius-sm: 8px;
	--font: 'Manrope', system-ui, sans-serif;
	--mono: 'DM Mono', monospace;
}

@media (prefers-color-scheme: dark) {
	:root {
		--bg: #151a18;
		--bg-tertiary: #202724;
		--surface: #1b211f;
		--surface-hover: #26302c;
		--border: #34413c;
		--text: #edf2ef;
		--text-muted: #9caaa4;
		--accent: #54b9a3;
		--accent-dim: #79cbb9;
	}
}
```

## Guidelines

- **Layout:** use the full screen; keep content narrow where readability matters.
- **Typography:** use `var(--font)` for text and `var(--mono)` for code, labels, and technical values.
- **Surfaces:** keep content on the page background where possible. Add a surface only to clarify structure or interaction; use subtle borders, minimal shadows, and no nested cards.
- **Buttons:** use icons for familiar actions, text for explicit commands, and circles for primary icon actions.
- **Shapes:** favor rounded forms. Use a `12px` default radius and `8px` for compact elements. Reserve pills for filters, tabs, and inputs.
- **Interaction:** reveal secondary actions on hover or focus and use short, subtle animations.
- **Theme:** respect `prefers-color-scheme`; use the shared tokens rather than hard-coded component colors.
- **Responsive:** design for mobile; stack content and replace wide navigation below `640px` with a compact alternative.
- **Accessibility:** provide visible keyboard focus, sufficient contrast, and touch targets of at least `40px`.

Apps may have their own character, but should reuse these tokens and core guidelines.
