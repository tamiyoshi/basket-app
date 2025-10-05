"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const radiusOptions = [
  { label: "1km", value: 1000 },
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "10km", value: 10000 },
] as const;

export function LocationFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLocating, setIsLocating] = useState(false);
  const activeRadius = Number(searchParams.get("radius")) || 5000;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("このブラウザでは位置情報が利用できません");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", position.coords.latitude.toFixed(6));
        params.set("lng", position.coords.longitude.toFixed(6));
        params.set("radius", String(activeRadius));
        router.replace(`/?${params.toString()}`);
      },
      () => {
        setIsLocating(false);
        alert("位置情報を取得できませんでした");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    );
  };

  const handleRadiusChange = (radius: number) => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const params = new URLSearchParams(searchParams.toString());
    params.set("radius", String(radius));

    if (!lat || !lng) {
      router.replace(`/?${params.toString()}`);
      return;
    }

    router.replace(`/?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    params.delete("radius");
    router.replace(`/?${params.toString()}`);
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleUseCurrentLocation} size="sm" disabled={isLocating}>
          {isLocating ? "取得中..." : "現在地付近で検索"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          位置情報をリセット
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {radiusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleRadiusChange(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 transition",
              activeRadius === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:border-primary hover:text-primary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {searchParams.get("lat") && searchParams.get("lng") ? (
        <p className="text-xs text-muted-foreground">
          現在地: 緯度 {searchParams.get("lat")}, 経度 {searchParams.get("lng")} / 半径 {activeRadius / 1000}km
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          位置情報を許可すると近くのコートを優先表示します。
        </p>
      )}
    </div>
  );
}
