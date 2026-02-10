"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);

  // データの取得処理
  const fetchTickets = async () => {
    try {
      const res = await fetch("https://haunted-house-system.onrender.com/admin/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    }
  };

  // 1. 呼出処理 (Statusを "calling" に変更)
  const handleCall = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${id}/call`, { 
        method: "PATCH" 
      });
      if (res.ok) {
        fetchTickets(); // 状態を即時更新
      }
    } catch (e) {
      console.error("呼出エラー:", e);
    }
  };

  // 2. 入場完了処理 (Statusを "entered" に変更)
  const handleEnter = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${id}/enter`, { 
        method: "PATCH" 
      });
      if (res.ok) {
        fetchTickets(); // 状態を即時更新（リストから消える）
      }
    } catch (e) {
      console.error("入場処理エラー:", e);
    }
  };

  // 3秒おきに自動更新
  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 text-zinc-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-8 border-b-2 border-red-600 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-red-700">STAFF CONTROL</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Haunted House Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-400 uppercase">Waitlist</p>
            <p className="text-4xl font-black tabular-nums">{tickets.length}<span className="text-sm ml-1">組</span></p>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900 text-white uppercase text-[10px] tracking-[0.2em]">
                <th className="p-5 border-b border-zinc-800">Time / 予約時間</th>
                <th className="p-5 border-b border-zinc-800">No. / 番号</th>
                <th className="p-5 border-b border-zinc-800">Guest / お名前</th>
                <th className="p-5 border-b border-zinc-800">Party / 人数</th>
                <th className="p-5 border-b border-zinc-800 text-center">Action / 操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-zinc-300 font-bold italic">
                    現在、待機中または呼出中のゲストはいません。
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className={`transition-colors ${t.status === "calling" ? "bg-amber-50" : "hover:bg-zinc-50"}`}>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.scheduled_time === "今すぐ入場" 
                        ? "bg-zinc-100 text-zinc-500" 
                        : "bg-red-100 text-red-700 border border-red-200"
                      }`}>
                        {t.scheduled_time}
                      </span>
                    </td>
                    <td className="p-5 text-3xl font-black text-zinc-900 tabular-nums">
                      <span className="text-zinc-300 text-xl mr-0.5">#</span>{t.display_id}
                    </td>
                    <td className="p-5">
                      <p className="font-black text-lg text-zinc-800 leading-none">{t.guest_name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 tracking-tighter">Verified Entry</p>
                    </td>
                    <td className="p-5">
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="bg-zinc-100 px-2 py-1 rounded text-zinc-600">大人 {t.adult_count}</span>
                        <span className="bg-zinc-100 px-2 py-1 rounded text-zinc-600">子供 {t.child_count}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex gap-2 justify-center">
                        {/* 呼出ボタン */}
                        <button 
                          onClick={() => handleCall(t.id)} 
                          className={`font-black py-2 px-5 rounded-xl transition-all text-xs tracking-widest ${
                            t.status === "calling" 
                            ? "bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-200" 
                            : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                          }`}
                        >
                          {t.status === "calling" ? "呼出中..." : "呼出"}
                        </button>

                        {/* 入場ボタン */}
                        <button 
                          onClick={() => handleEnter(t.id)} 
                          className="bg-red-700 hover:bg-red-600 text-white font-black py-2 px-5 rounded-xl active:scale-95 transition-all text-xs tracking-widest shadow-md hover:shadow-red-200"
                        >
                          入場
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}