"use client";

import { useEffect, useState } from "react";
import { MapPinned, Sparkles } from "lucide-react";

const SPLASH_DURATION_MS = 5600;
const FADE_DURATION_MS = 1000;

export function AppSplash() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const displayTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(displayTimer);
  }, []);

  useEffect(() => {
    if (isVisible) {
      return;
    }
    const fadeTimer = window.setTimeout(() => setShouldRender(false), FADE_DURATION_MS);
    return () => window.clearTimeout(fadeTimer);
  }, [isVisible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={[
        "fixed inset-0 z-[1600] flex items-center justify-center bg-slate-950 text-slate-100 transition-opacity duration-1000 ease-out",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.22),_transparent_60%)] transition-opacity duration-1000 ease-out" />
      <div
        className={[
          "relative mx-6 max-w-lg space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-10 text-center shadow-[0_40px_140px_rgba(15,23,42,0.8)] backdrop-blur transition-all duration-1000 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        ].join(" ")}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
          <MapPinned className="h-7 w-7 text-orange-300" />
        </div>
        <div className="space-y-3">
          <p className="text-lg font-medium tracking-wide text-white/80">Street Court Explorer</p>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            全国の屋外バスケットコートを地図で探して、リアルな空気を共有しよう。
          </h1>
          <p className="text-sm leading-relaxed text-white/70">
            現在地からの距離、設備タグ、レビューを頼りに、自分たちのピックアップゲームにぴったりのコートを見つけられます。
          </p>
        </div>
        <div className="space-y-2 text-left text-sm text-white/70">
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-300" />
            地図はドラッグ＆ズームで移動。ピンをタップして詳細をチェック。
          </p>
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-300" />
            コート情報を投稿すると、コミュニティの信頼度が上がります。
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Loading courts…</p>
      </div>
    </div>
  );
}
