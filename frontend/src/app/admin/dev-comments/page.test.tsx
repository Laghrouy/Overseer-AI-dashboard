import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import AdminDevCommentsPage from "./page";
import { apiDevFeedbackList } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiDevFeedbackList: vi.fn(),
}));

vi.mock("@/store/auth", () => {
  const state = {
    token: "token-123",
    email: "admin@example.com",
    setToken: vi.fn(),
    setEmail: vi.fn(),
    clear: vi.fn(),
  };
  const useAuthStore = (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state);
  // @ts-expect-error attach getState for api helpers
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

const sampleComments = [
  {
    id: "c1",
    owner_id: 1,
    category: "bug",
    summary: "Bug summary",
    details: "Does not render",
    created_at: new Date().toISOString(),
    reproduction: "Steps to repro",
  },
  {
    id: "c2",
    owner_id: 1,
    category: "suggestion",
    summary: "Suggestion summary",
    details: "Make the dashboard brighter",
    created_at: new Date().toISOString(),
    contact: "me@example.com",
  },
];

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminDevCommentsPage />
    </QueryClientProvider>
  );
}

describe("Admin dev comments", () => {
  beforeEach(() => {
    apiDevFeedbackList.mockResolvedValue(sampleComments);
  });

  it("renders counts and comment cards", async () => {
    renderPage();

    await waitFor(() => expect(apiDevFeedbackList).toHaveBeenCalled());
    await screen.findByText("Bug summary");

    expect(screen.getByText(/Bugs : 1/)).toBeInTheDocument();
    expect(screen.getByText(/Propositions : 1/)).toBeInTheDocument();
    expect(screen.getByText("Bug summary")).toBeInTheDocument();
    expect(screen.getByText("Suggestion summary")).toBeInTheDocument();
  });

  it("filters the visible comments via search", async () => {
    renderPage();

    const searchInput = await screen.findByPlaceholderText("Résumé, détail, reproduction...");
    await waitFor(() => expect(apiDevFeedbackList).toHaveBeenCalled());
    await userEvent.type(searchInput, "Bug");

    await waitFor(() => {
      expect(screen.getByText("Bug summary")).toBeInTheDocument();
      expect(screen.queryByText("Suggestion summary")).not.toBeInTheDocument();
    });
  });
});
