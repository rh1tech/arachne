/** A self-contained placeholder image (no network), tinted by `hue`. */
export const swatch = (hue: number, label: string, width = 640, height = 400) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 55%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(height / 8)}" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
	)}`;
