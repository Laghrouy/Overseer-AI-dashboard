import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/store/auth", () => ({
  useAuthStore: {
    getState: () => ({ clear: vi.fn() }),
  },
}));

import { apiStudyPlanGenerate, apiStudyAssist, apiStudySessionUpdate, apiStudyCardReview } from "./api";

const API_BASE = "http://localhost:8000/api";

beforeEach(() => {
  vi.restoreAllMocks();
  // Ensure deterministic base in tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).env.NEXT_PUBLIC_API_BASE = API_BASE;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api study helpers", () => {
  const token = "token-123";

  it("posts plan generation with correct payload", async () => {
    const payload = { subject_id: 1, topics: ["A", "B"], session_minutes: 25, sessions_per_day: 2 };
    const responseBody = { id: 9, title: "Plan", subject_id: 1, exam_date: null, total_minutes: 50, sessions: [] };

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200, headers: { "content-type": "application/json" } })
    );

    const res = await apiStudyPlanGenerate(token, payload);

    expect(res.id).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/study/plan/generate`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
    expect(init?.body).toBe(JSON.stringify(payload));
  });

  it("posts study assist request", async () => {
    const assistPayload = { subject: "Maths", topic: "Intégrales", mode: "resume", difficulty: "medium", items: 3 };
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ output: "résumé" }), { status: 200, headers: { "content-type": "application/json" } })
    );

    const res = await apiStudyAssist(token, assistPayload);

    expect(res.output).toBe("résumé");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/study/assist`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject(assistPayload);
  });

  it("patches study session update", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 3, status: "done" }), { status: 200, headers: { "content-type": "application/json" } })
    );

    await apiStudySessionUpdate(token, 3, { status: "done" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/study/sessions/3`);
    expect(init?.method).toBe("PATCH");
  });

  it("reviews a study card", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 7, last_score: 5 }), { status: 200, headers: { "content-type": "application/json" } })
    );

    await apiStudyCardReview(token, 7, 5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/study/cards/7/review`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ score: 5 });
  });
});
