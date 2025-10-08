"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

import type { CourtSummary } from "@/lib/courts";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 }; // Tokyo Station as fallback
const DEFAULT_ZOOM = 12;
const COURT_MAX_ZOOM = 16;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f97316" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#f97316" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0ea5e9" }],
  },
];

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? process.env.NEXT_PUBLIC_google_api_key;

export type CourtMapProps = {
  courts: CourtSummary[];
  location?: {
    lat: number;
    lng: number;
  } | null;
  className?: string;
};

type GoogleMap = google.maps.Map;

type Marker = google.maps.Marker;

export function CourtMap({ courts, location, className }: CourtMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(apiKey));
  const hasCourts = useMemo(
    () => courts.some((court) => typeof court.latitude === "number" && typeof court.longitude === "number"),
    [courts],
  );

  const initialCenter = useMemo(() => {
    if (location && isFinite(location.lat) && isFinite(location.lng)) {
      return location;
    }
    const firstCourt = courts.find(
      (court) => typeof court.latitude === "number" && typeof court.longitude === "number",
    );
    if (firstCourt) {
      return { lat: firstCourt.latitude, lng: firstCourt.longitude };
    }
    return DEFAULT_CENTER;
  }, [courts, location]);

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
          center: initialCenter,
          zoom: location ? 14 : hasCourts ? 13 : DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: MAP_STYLES,
          backgroundColor: "#0f172a",
        });

        mapRef.current = map;
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
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [hasCourts, initialCenter, location]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const map = mapRef.current;
    const bounds = new google.maps.LatLngBounds();
    let hasAnyMarker = false;

    courts.forEach((court) => {
      const lat = court.latitude;
      const lng = court.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return;
      }

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: court.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#f97316",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeOpacity: 0.9,
          strokeWeight: 2,
        },
        zIndex: 5,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-size: 14px; max-width: 220px;">
            <strong>${court.name}</strong><br />
            <span>${court.address}</span><br />
            <span>${court.is_free ? "無料" : "有料"}</span>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ map, anchor: marker });
      });

      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
      hasAnyMarker = true;
    });

    if (location && isFinite(location.lat) && isFinite(location.lng)) {
      const locationMarker = new google.maps.Marker({
        position: location,
        map,
        title: "現在地",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#38bdf8",
          fillOpacity: 0.95,
          strokeColor: "#0f172a",
          strokeOpacity: 0.9,
          strokeWeight: 2,
        },
        zIndex: 6,
      });
      markersRef.current.push(locationMarker);
      bounds.extend(location);
      hasAnyMarker = true;
    }

    if (hasAnyMarker) {
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
      const idleListener = google.maps.event.addListenerOnce(map, "idle", () => {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom > COURT_MAX_ZOOM) {
          map.setZoom(COURT_MAX_ZOOM);
        }
      });
      return () => {
        google.maps.event.removeListener(idleListener);
      };
    }

    if (!hasAnyMarker) {
      map.setCenter(initialCenter);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [courts, initialCenter, location]);

  if (loadError) {
    return (
      <div
        className={cn(
          "flex h-64 items-center justify-center rounded-3xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-lg",
          className,
        )}
      >
        {loadError}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-64 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl",
        className,
      )}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          地図を読み込んでいます...
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
