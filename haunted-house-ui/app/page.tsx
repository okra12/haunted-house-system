"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [scheduledTime, setScheduledTime] = useState("今すぐ入場");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [callingId, setCallingId] = useState(0);
  const [callingName, setCallingName] = useState("");
  const [slotUsage, setSlotUsage] = useState<Record<string, number>>({}); // スロットごとの予約数
  const [isPending, setIsPending] = useState(false);

  const timeSlots = ["今すぐ入場", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  const MAX_PER_SLOT = 5;

  const syncData = async () => {
    try {
      // 待ち組数・呼び出し中
      const waitRes = await fetch("http://127.0.0.1:8000/tickets/waiting-count");
      if (waitRes.ok) setWaitingCount((await waitRes.json()).waiting_count);
      
      const callRes = await fetch("http://127.0.0.1:8000/tickets/calling-now");
      if (callRes.ok) {
        const data = await callRes.json();
        setCallingId(data.calling_id);
        setCallingName(data.calling_name);
      }

      // スロットの使用状況を取得
      const usageRes = await fetch("http://127.0.0.1:8000/tickets/slots-usage");
      if (usageRes.ok) setSlotUsage(await usageRes.json());

    } catch (e) { console.error("Sync failed", e); }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 10000); // 10秒おき [cite: 2025-10-08]
    return () => clearInterval(interval);
  }, []);

  const issueTicket = async () => {
    if (!name.trim()) return alert("お名前を入力してください...");
    if (isPending) return;

    setIsPending(true); 
    try {
      const response = await fetch("http://10.22.242.115:8000/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name,
          adult_count: adults,
          child_count: children,
          scheduled_time: scheduledTime,
          secret_word: "須貝研2026" 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTicketId(result.data[0].display_id);
        setTimeout(() => syncData(), 500);
      } else {
        const err = await response.json();
        alert(err.detail || "発行に失敗しました。");
        syncData(); // 最新の空き状況を反映
      }
    } catch (e) {
      alert("通信エラーが発生しました。");
    } finally {
      setTimeout(() => setIsPending(false), 500);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden font-sans">
      {/* 待ち組数 */}
      <div className="absolute top-10 right-10 bg-zinc-900 border border-red-900/50 px-6 py-3 rounded-2xl text-center shadow-lg">
        <p className="text-[10px] text-red-500 font-bold tracking-widest uppercase mb-1">Waiting</p>
        <p className="text-3xl font-black">{waitingCount}組</p>
      </div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* NOW CALLING */}
        <div className="text-center space-y-2">
          <p className="text-red-600 font-bold tracking-[0.3em] text-sm">NOW CALLING</p>
          <div className="bg-red-950/20 border border-red-900/30 p-5 rounded-3xl backdrop-blur-sm shadow-inner">
            <div className="text-6xl font-black text-white mb-2">
              <span className="text-red-800 text-4xl mr-1">#</span>{callingId || "--"}
            </div>
            <div className="text-xl font-bold text-zinc-300 truncate">
              {callingName || "待機中"} 様
            </div>
          </div>
        </div>

        {!ticketId ? (
          <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-3xl shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-center text-red-700 tracking-[0.2em] uppercase">Reception</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 ml-1 uppercase">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="代表者氏名" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:border-red-800 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 ml-1 uppercase">Time Slot</label>
                <select 
                  value={scheduledTime} 
                  onChange={(e) => setScheduledTime(e.target.value)} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:border-red-800 outline-none"
                >
                  {timeSlots.map(t => {
                    const count = slotUsage[t] || 0;
                    const isFull = t !== "今すぐ入場" && count >= MAX_PER_SLOT;
                    return (
                      <option key={t} value={t} disabled={isFull}>
                        {t} {isFull ? "(満員)" : count > 0 ? `(${count}/${MAX_PER_SLOT}組)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex justify-between items-center text-lg px-2">
                <span className="font-bold text-zinc-200">大人</span>
                <div className="flex gap-5 items-center">
                  <button onClick={() => setAdults(Math.max(0, adults - 1))} className="w-9 h-9 bg-zinc-800 rounded-full font-black border border-zinc-700 active:bg-zinc-700 transition-colors">-</button>
                  <span className="w-4 text-center tabular-nums">{adults}</span>
                  <button onClick={() => setAdults(adults + 1)} className="w-9 h-9 bg-zinc-800 rounded-full font-black border border-zinc-700 active:bg-zinc-700 transition-colors">+</button>
                </div>
              </div>
            </div>
            <button onClick={issueTicket} disabled={isPending} className={`w-full font-bold py-5 rounded-2xl transition-all shadow-[0_0_20px_rgba(153,27,27,0.3)] ${isPending ? "bg-zinc-800 text-zinc-600" : "bg-red-800 hover:bg-red-700 active:scale-95 text-white"}`}>
              {isPending ? "幽霊が準備中..." : "整理券を発行する"}
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border-4 border-red-700 p-10 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(185,28,28,0.2)]">
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em]">Your Ticket</p>
            <div className="text-8xl font-black text-white py-4 border-y border-red-900/30 tabular-nums">#{ticketId}</div>
            <div className="text-zinc-300 font-bold space-y-2">
              <p className="text-xl">恐れ入ります、{name} 様</p>
              <p className="text-red-600">予約枠：{scheduledTime}</p>
              <div className="h-px w-12 bg-zinc-800 mx-auto my-4"></div>
              <p className="text-sm text-zinc-500">
                現在の待ち時間は約 {waitingCount * 5} [min] です。<br/>
                番号をお呼びするまでお待ちください。
              </p>
            </div>
            <button onClick={() => { setTicketId(null); setName(""); setScheduledTime("今すぐ入場"); }} className="mt-6 text-zinc-600 text-sm hover:text-zinc-300 underline underline-offset-8">戻る</button>
          </div>
        )}
      </div>
    </main>
  );
}