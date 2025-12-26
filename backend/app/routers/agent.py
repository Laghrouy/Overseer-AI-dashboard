from fastapi import APIRouter, Depends, HTTPException

from ..config import Settings
from ..deps import get_current_user, get_db
from ..schemas import AgentChatRequest, AgentChatResponse, AgentPlanRequest, AgentPlanResponse
from ..services.agent import generate_chat_reply, log_agent_decision, summarize_chat

settings = Settings()
router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/plan", response_model=AgentPlanResponse)
async def plan_day(
    payload: AgentPlanRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Planification non disponible (Mongo uniquement)")


@router.post("/chat", response_model=AgentChatResponse)
async def chat(
    payload: AgentChatRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    reply = await generate_chat_reply(payload.message, user)
    await log_agent_decision(session, user, "chat", reply, [])
    return AgentChatResponse(reply=reply)


@router.post("/chat-summary", response_model=dict)
async def chat_summary(
    payload: AgentChatRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    summary = await summarize_chat(payload.history or [])
    await log_agent_decision(session, user, "chat-summary", summary, [])
    return {"summary": summary}
