from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id, strip_mongo_id
from ..schemas import Token, UserCreate, UserRead
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
async def register(payload: UserCreate, session=Depends(get_db)):
    existing = await session["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur déjà existant")

    user_doc = {
        "id": await get_next_id(session, "users"),
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
    }
    await session["users"].insert_one(user_doc)
    return UserRead(**strip_mongo_id(user_doc))


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session=Depends(get_db)):
    user = await session["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    token = create_access_token(subject=user["email"])
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(user=Depends(get_current_user)):
    return UserRead(id=user["id"], email=user["email"])
