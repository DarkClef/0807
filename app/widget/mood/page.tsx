import React from 'react';

// Next.js App Router (TypeScript + Tailwind CSS) — Widgetable / Locket Style Couple Widget
interface MoodData {
  partner: string;
  emoji: string;
  text: string;
  note?: string;
  location?: string;
  avatarUrl?: string;
  updatedAt: string;
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Az önce';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  return `${days}gün`;
}

async function getLatestMoods(): Promise<{ nese: MoodData; mete: MoodData }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/mood`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('API Hatası');
    return await res.json();
  } catch (err) {
    return {
      nese: {
        partner: 'Neşe',
        emoji: '😮‍💨',
        text: 'Acıktım',
        location: 'Ev',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      mete: {
        partner: 'Mete',
        emoji: '🤔',
        text: 'Düşünüyor',
        location: 'Lunapark',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        updatedAt: new Date(Date.now() - 1920000).toISOString(),
      },
    };
  }
}

export default async function MoodWidgetPage() {
  const { nese, mete } = await getLatestMoods();

  return (
    <div className="w-[340px] h-[170px] rounded-[32px] overflow-hidden flex shadow-2xl font-sans select-none border border-white/10">
      {/* LEFT PANEL — NEŞE */}
      <div className="flex-1 bg-gradient-to-br from-[#8e75d5] via-[#7b62c4] to-[#634ca8] p-3.5 flex flex-col justify-between relative text-white">
        {/* Top Avatar */}
        <div className="flex items-center gap-2 z-10">
          <img
            src={nese.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt="Neşe"
            className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-md"
          />
          <span className="text-[11px] font-bold tracking-wide opacity-90">Neşe</span>
        </div>

        {/* Center Large Status Emoji & Text */}
        <div className="flex flex-col items-center justify-center my-auto">
          <span className="text-5xl drop-shadow-md mb-1 animate-pulse">
            {nese.emoji || '🥰'}
          </span>
          <span className="font-extrabold text-lg tracking-tight text-white drop-shadow-sm">
            {nese.text || 'Çok Mutlu'}
          </span>
        </div>

        {/* Bottom Time / Location */}
        <div className="text-center text-[10px] text-white/70 font-medium tracking-wide">
          {nese.location ? `📍 ${nese.location} | ` : ''}
          {getTimeAgo(nese.updatedAt)}
        </div>
      </div>

      {/* RIGHT PANEL — METE */}
      <div className="flex-1 bg-gradient-to-br from-[#536b9c] via-[#455a88] to-[#36476e] p-3.5 flex flex-col justify-between relative text-white border-l border-white/10">
        {/* Top Avatar (Right Aligned) */}
        <div className="flex items-center justify-end gap-2 z-10">
          <span className="text-[11px] font-bold tracking-wide opacity-90">Mete</span>
          <img
            src={mete.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
            alt="Mete"
            className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-md"
          />
        </div>

        {/* Center Large Status Emoji & Text */}
        <div className="flex flex-col items-center justify-center my-auto">
          <span className="text-5xl drop-shadow-md mb-1 animate-pulse">
            {mete.emoji || '💖'}
          </span>
          <span className="font-extrabold text-lg tracking-tight text-white drop-shadow-sm">
            {mete.text || 'Aşık'}
          </span>
        </div>

        {/* Bottom Location & Time */}
        <div className="text-center text-[10px] text-white/70 font-medium tracking-wide truncate">
          {mete.location ? `📍 ${mete.location} | ` : ''}
          {getTimeAgo(mete.updatedAt)}
        </div>
      </div>
    </div>
  );
}
