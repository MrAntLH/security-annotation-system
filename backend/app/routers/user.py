from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, LoginRequest, TokenResponse, UserResponse
from ..auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=TokenResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 校验角色
    if user.role not in ["requester", "worker"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'requester' or 'worker'"
        )

    # 校验用户名是否重复
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # 创建用户
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 生成token
    access_token = create_access_token({
        "user_id": db_user.id,
        "role": db_user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # 查找用户
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # 验证密码
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # 生成token
    access_token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
