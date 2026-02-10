import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

MAX_TICKETS_PER_SLOT = 5

class TicketCreate(BaseModel):
    guest_name: str
    adult_count: int
    child_count: int
    scheduled_time: str
    secret_word: str

@app.get("/")
async def root():
    return {"message": "幽霊屋屋敷API 稼働中"}

# --- 1. 整理券発行（定員チェック付き） ---
@app.post("/tickets")
async def create_ticket(ticket: TicketCreate):
    try:
        if ticket.scheduled_time != "今すぐ入場":
            check_res = supabase.table("tickets") \
                .select("id", count="exact") \
                .eq("scheduled_time", ticket.scheduled_time) \
                .eq("status", "waiting") \
                .execute()
            
            current_count = check_res.count if check_res.count is not None else 0
            if current_count >= MAX_TICKETS_PER_SLOT:
                raise HTTPException(
                    status_code=400, 
                    detail=f"{ticket.scheduled_time} の枠は定員（{MAX_TICKETS_PER_SLOT} [組] ）に達しました"
                )

        response = supabase.table("tickets").insert({
            "guest_name": ticket.guest_name,
            "adult_count": ticket.adult_count,
            "child_count": ticket.child_count,
            "scheduled_time": ticket.scheduled_time,
            "status": "waiting",
            "secret_word": ticket.secret_word
        }).execute()
        
        return {"message": "Success", "data": response.data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ エラー: {e}")
        raise HTTPException(status_code=500, detail="発行処理に失敗しました")

# --- 2. スロットの使用状況取得 ---
@app.get("/tickets/slots-usage")
async def get_slots_usage():
    try:
        response = supabase.table("tickets").select("scheduled_time").eq("status", "waiting").execute()
        counts = {}
        for t in response.data:
            time_str = t["scheduled_time"]
            counts[time_str] = counts.get(time_str, 0) + 1
        return counts
    except:
        return {}

# --- 3. 待ち組数取得 ---
@app.get("/tickets/waiting-count")
async def get_waiting_count():
    try:
        res = supabase.table("tickets").select("id", count="exact").eq("status", "waiting").execute()
        return {"waiting_count": res.count if res.count is not None else 0}
    except:
        return {"waiting_count": 0}

# --- 4. 現在「呼び出し中」の番号と名前を取得（修正済み） ---
@app.get("/tickets/calling-now")
async def get_calling_now():
    try:
        # status が 'calling'（スタッフが呼出ボタンを押した）の最新1件を表示
        response = supabase.table("tickets") \
            .select("display_id", "guest_name") \
            .eq("status", "calling") \
            .order("display_id", desc=True) \
            .limit(1) \
            .execute()
        
        if response.data:
            return {
                "calling_id": response.data[0]["display_id"],
                "calling_name": response.data[0].get("guest_name") or "不明"
            }
        return {"calling_id": 0, "calling_name": "待機中"}
    except:
        return {"calling_id": 0, "calling_name": "通信中..."}

# --- 5. スタッフ用：リスト取得（修正済み：待機中と呼出中の両方を出す） ---
@app.get("/admin/tickets")
async def get_admin_tickets():
    try:
        response = supabase.table("tickets") \
            .select("*") \
            .in_("status", ["waiting", "calling"]) \
            .order("scheduled_time") \
            .order("display_id") \
            .execute()
        return [{"guest_name": t.get("guest_name") or "（名無し様）", **t} for t in response.data]
    except:
        return []

# --- 6. スタッフ用：呼び出しステータスに更新 ---
@app.patch("/tickets/{ticket_id}/call")
async def call_ticket(ticket_id: str):
    try:
        response = supabase.table("tickets").update({"status": "calling"}).eq("id", ticket_id).execute()
        return {"message": "Called", "data": response.data}
    except:
        raise HTTPException(status_code=500, detail="呼び出し失敗")

# --- 7. スタッフ用：入場完了（ステータスを entered にしてリストから消す） ---
@app.patch("/tickets/{ticket_id}/enter")
async def enter_ticket(ticket_id: str):
    try:
        response = supabase.table("tickets").update({"status": "entered"}).eq("id", ticket_id).execute()
        return {"message": "Updated", "data": response.data}
    except:
        raise HTTPException(status_code=500, detail="更新失敗")