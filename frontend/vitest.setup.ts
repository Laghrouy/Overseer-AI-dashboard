import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

type MutableURL = {
	createObjectURL: (object: Blob | MediaSource) => string;
	revokeObjectURL: (url: string) => void;
};

const globalWithURL = globalThis as typeof globalThis & { URL?: Partial<MutableURL> };

// Polyfill minimal pour URL.createObjectURL / revokeObjectURL dans JSDOM
if (!globalWithURL.URL) {
	globalWithURL.URL = {};
}

if (!globalWithURL.URL.createObjectURL) {
	globalWithURL.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

if (!globalWithURL.URL.revokeObjectURL) {
	globalWithURL.URL.revokeObjectURL = vi.fn();
}
