from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .config import Settings
from .db import get_mongo_session
from .security import decode_token

settings = Settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session=Depends(get_mongo_session),
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    user = await session["users"].find_one({"email": payload.sub})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return user


async def get_db(session=Depends(get_mongo_session)):
    return session
