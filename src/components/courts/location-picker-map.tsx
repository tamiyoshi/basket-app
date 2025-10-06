"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

import { cn } from "@/lib/utils";

const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 }; // Tokyo Station fallback
const DEFAULT_ZOOM = 11;

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? process.env.NEXT_PUBLIC_google_api_key;

type LatLngValue = {
  lat: number;
  lng: number;
} | null;

type LocationPickerMapProps = {
  value: LatLngValue;
  onChange: (value: LatLngValue) => void;
  className?: string;
};

type GoogleMap = google.maps.Map;

type Marker = google.maps.Marker;

export function LocationPickerMap({ value, onChange, className }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(apiKey));

  useEffect(() => {
    if (!apiKey) {
      setLoadError("Google Maps API キーが設定されていません");
      setIsLoading(false);
      return;
    }

    if (!containerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    setOptions({ key: apiKey, v: "weekly" });

    importLibrary("maps")
      .then((maps) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        const { Map } = maps as google.maps.MapsLibrary;
        const map = new Map(containerRef.current, {
          center: value ?? DEFAULT_CENTER,
          zoom: value ? 14 : DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const position = event.latLng;
          if (!position) {
            return;
          }

          const lat = position.lat();
          const lng = position.lng();
          setMarker({ lat, lng });
          onChange({ lat, lng });
        });

        if (value) {
          setMarker(value);
        }

        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps", error);
        if (!isMounted) {
          return;
        }
        const message = String(error);
        const hint = message.includes("ApiProjectMapError")
          ? "Google Maps JavaScript API が有効化されているか、APIキーのドメイン制限を確認してください。"
          : "地図の読み込みに失敗しました";
        setLoadError(hint);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (value) {
      setMarker(value);
      mapRef.current.setCenter(value);
      mapRef.current.setZoom(14);
    }
  }, [value]);

  const setMarker = (position: { lat: number; lng: number }) => {
    if (!mapRef.current) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
      });
    }

    markerRef.current.setPosition(position);
  };

  if (loadError) {
    return (
      <div className={cn("flex h-72 items-center justify-center rounded-lg border bg-card p-6 text-sm text-muted-foreground", className)}>
        {loadError}
      </div>
    );
  }

  return (
    <div className={cn("relative h-72 rounded-xl border bg-card", className)}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          地図を読み込んでいます...
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full rounded-xl" />
    </div>
  );
}
