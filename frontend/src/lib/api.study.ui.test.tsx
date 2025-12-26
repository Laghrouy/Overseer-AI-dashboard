import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { apiStudySubjects, apiStudySessionsDue, apiStudyCardsDue } from "./api";

vi.mock("@/store/auth", () => {
  const state = {
    token: "token-123",
    email: "user@example.com",
    setToken: vi.fn(),
    setEmail: vi.fn(),
    clear: vi.fn(),
  };
  const useAuthStore = (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state);
  // @ts-expect-error attach getState for api helper
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

const API = "http://localhost:8000/api";

const server = setupServer(
  http.get(`${API}/study/subjects`, () => HttpResponse.json([{ id: 1, name: "Maths", description: null, ue_code: "UE101" }])),
  http.get(`${API}/study/sessions/due`, () =>
    HttpResponse.json([
      { id: 11, subject_id: 1, plan_id: 2, kind: "revision", topic: "Algèbre", status: "planned", scheduled_for: "2025-12-25T10:00:00Z", duration_minutes: 25 },
    ])
  ),
  http.get(`${API}/study/cards/due`, () =>
    HttpResponse.json([
      { id: 21, subject_id: 1, front: "Q1", back: "R1", due_at: "2025-12-25T12:00:00Z", interval_days: 1, ease: 2.3, streak: 0, last_score: null },
    ])
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function StudyProbe() {
  const { data: subjects } = useQuery({ queryKey: ["study-subjects", "token"], queryFn: () => apiStudySubjects("token") });
  const { data: sessions } = useQuery({ queryKey: ["study-sessions-due", "token"], queryFn: () => apiStudySessionsDue("token") });
  const { data: cards } = useQuery({ queryKey: ["study-cards-due", "token"], queryFn: () => apiStudyCardsDue("token") });

  return (
    <div>
      <div>Subjects: {subjects?.map((s) => s.name).join(", ")}</div>
      <div>Sessions: {sessions?.map((s) => `${s.kind}-${s.topic}`).join(", ")}</div>
      <div>Cards: {cards?.map((c) => c.front).join(", ")}</div>
    </div>
  );
}

describe("study UI data fetching", () => {
  it("renders subjects, sessions, and cards from API", async () => {
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <StudyProbe />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Subjects: Maths/)).toBeInTheDocument();
      expect(screen.getByText(/Sessions: revision-Algèbre/)).toBeInTheDocument();
      expect(screen.getByText(/Cards: Q1/)).toBeInTheDocument();
    });
  });
});
