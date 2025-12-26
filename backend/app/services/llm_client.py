from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional

import httpx

from app.config import Settings


class LLMClient:
    """Client centralisé pour les appels LLM.

    Cette classe encapsule la configuration (`Settings`), la gestion
    de `httpx.AsyncClient`, les timeouts et une partie du traitement
    d'erreurs. L'objectif est de retirer la duplication présente dans
    `services.agent` et `services.learning`.
    """

    def __init__(
        self,
        settings: Optional[Settings] = None,
        *,
        timeout: float = 15.0,
    ) -> None:
        self.settings = settings or Settings()
        self.timeout = timeout

    def _build_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if self.settings.openai_api_key:
            headers["Authorization"] = f"Bearer {self.settings.openai_api_key}"

        if "openrouter.ai" in self.settings.llm_api_base:
            headers["HTTP-Referer"] = "http://localhost"
            headers["X-Title"] = "OVERSEER"
        return headers

    async def chat(  # pragma: no cover - thin async wrapper
        self,
        messages: List[Mapping[str, str]],
        *,
        max_tokens: int = 512,
        allow_reasoning: bool = True,
    ) -> str:
        """Effectue un appel `/chat/completions` et retourne le texte.

        Cette méthode ne connaît pas la sémantique métier des prompts,
        elle délègue simplement à l'API et renvoie le contenu texte.
        """

        if not self.settings.openai_api_key:
            raise RuntimeError("LLM non configuré (clé API manquante)")

        payload: Dict[str, Any] = {
            "model": self.settings.llm_model,
            "messages": list(messages),
            "max_tokens": max_tokens,
        }

        headers = self._build_headers()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.settings.llm_api_base}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return self._extract_choice_text(data, allow_reasoning=allow_reasoning)

    @staticmethod
    def _extract_choice_text(data: Mapping[str, Any], *, allow_reasoning: bool = True) -> str:
        choice = (data.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        content = (message.get("content") or "").strip()
        if content:
            return content

        if not allow_reasoning:
            reasoning_text = (message.get("reasoning") or "").strip()
            if not reasoning_text:
                details = choice.get("reasoning_details") or message.get("reasoning_details")
                if details and isinstance(details, list):
                    chunks = [r.get("text", "").strip() for r in details if isinstance(r, dict)]
                    reasoning_text = " ".join([c for c in chunks if c]).strip()

            if reasoning_text:
                for sep in [". ", "? ", "! "]:
                    parts = [p.strip() for p in reasoning_text.split(sep) if p.strip()]
                    if len(parts) > 1:
                        return parts[-1]
                return reasoning_text

        if allow_reasoning:
            reasoning = (message.get("reasoning") or "").strip()
            if reasoning:
                return reasoning

        if allow_reasoning:
            reasoning_details = choice.get("reasoning_details") or message.get("reasoning_details")
            if reasoning_details and isinstance(reasoning_details, list):
                texts = [r.get("text", "").strip() for r in reasoning_details if isinstance(r, dict)]
                joined = " ".join([t for t in texts if t])
                if joined:
                    return joined

        return f"LLM réponse vide: {data}"
