import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const globalWithURL = globalThis as typeof globalThis & { URL?: typeof URL };

// Polyfill minimal pour URL.createObjectURL / revokeObjectURL dans JSDOM
if (!globalWithURL.URL) {
	globalWithURL.URL = {} as typeof URL;
}

if (!globalWithURL.URL.createObjectURL) {
	globalWithURL.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

if (!globalWithURL.URL.revokeObjectURL) {
	globalWithURL.URL.revokeObjectURL = vi.fn();
}
