/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, AlertCircle } from "lucide-react";

const NEPAL_CENTER: [number, number] = [84.124, 28.394];

interface RouteMapDisplayProps {
  from: string;
  to: string;
  className?: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
}

async function geocodePlace(
  query: string,
  token: string,
): Promise<[number, number] | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      country: "np",
      limit: "1",
      access_token: token,
      types: "place,locality,district,region,neighborhood",
    });
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return [lng, lat];
  } catch {
    return null;
  }
}

export default function RouteMapDisplay({
  from,
  to,
  className = "",
}: RouteMapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    let destroyed = false;

    (async () => {
      const [{ default: mapboxgl }] = await Promise.all([
        import("mapbox-gl"),
        import("mapbox-gl/dist/mapbox-gl.css" as any),
      ]);

      if (destroyed) return;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      mapboxgl.accessToken = token;

      // Geocode both locations in parallel
      const [fromCoords, toCoords] = await Promise.all([
        geocodePlace(from, token),
        geocodePlace(to, token),
      ]);

      if (destroyed) return;

      if (!fromCoords || !toCoords) {
        setError(true);
        setLoading(false);
        return;
      }

      // Init map
      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: NEPAL_CENTER,
        zoom: 6,
        interactive: false, // read-only — no pan/zoom
      });

      mapRef.current = map;

      map.on("load", async () => {
        if (destroyed) return;

        // Markers
        function makeMarkerEl(color: string) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 26px; height: 26px;
            border-radius: 50% 50% 50% 0;
            background: ${color};
            border: 3px solid #fff;
            transform: rotate(-45deg);
            box-shadow: 0 3px 10px ${color}66;
          `;
          return el;
        }

        new mapboxgl.Marker({
          element: makeMarkerEl("#2563eb"),
          anchor: "bottom",
        })
          .setLngLat(fromCoords)
          .setPopup(
            new mapboxgl.Popup({ offset: 24, closeButton: false }).setHTML(
              `<p style="font-size:12px;font-weight:600;margin:0">📍 ${from}</p>`,
            ),
          )
          .addTo(map);

        new mapboxgl.Marker({
          element: makeMarkerEl("#dc2626"),
          anchor: "bottom",
        })
          .setLngLat(toCoords)
          .setPopup(
            new mapboxgl.Popup({ offset: 24, closeButton: false }).setHTML(
              `<p style="font-size:12px;font-weight:600;margin:0">🏁 ${to}</p>`,
            ),
          )
          .addTo(map);

        // Fetch OSRM route
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/` +
              `${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}` +
              `?overview=full&geometries=geojson`,
          );
          const data = await res.json();

          if (data.code === "Ok" && data.routes?.[0]) {
            const route = data.routes[0];

            // Route info
            const distKm = (route.distance / 1000).toFixed(1);
            const hrs = Math.floor(route.duration / 3600);
            const mins = Math.floor((route.duration % 3600) / 60);
            setRouteInfo({
              distance: `${distKm} km`,
              duration: hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`,
            });

            // Draw route
            map.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: route.geometry,
              },
            });

            map.addLayer({
              id: "route-border",
              type: "line",
              source: "route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#ffffff",
                "line-width": 7,
                "line-opacity": 0.5,
              },
            });

            map.addLayer({
              id: "route-line",
              type: "line",
              source: "route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#2563eb",
                "line-width": 4,
                "line-opacity": 0.9,
              },
            });

            // Fit to route
            const coords: [number, number][] = route.geometry.coordinates;
            const bounds = coords.reduce(
              (b: any, c: any) => b.extend(c),
              new mapboxgl.LngLatBounds(coords[0], coords[0]),
            );
            map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
          } else {
            // No route — just fit to markers
            const bounds = new mapboxgl.LngLatBounds(
              fromCoords,
              fromCoords,
            ).extend(toCoords);
            map.fitBounds(bounds, { padding: 80, maxZoom: 12 });
          }
        } catch {
          const bounds = new mapboxgl.LngLatBounds(
            fromCoords,
            fromCoords,
          ).extend(toCoords);
          map.fitBounds(bounds, { padding: 80, maxZoom: 12 });
        }

        setLoading(false);
      });
    })();

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [from, to]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Route info strip */}
      {routeInfo && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-1.5">
            <Navigation2 size={13} className="text-blue-600" />
            <span className="text-sm font-semibold text-[#252C32]">
              {routeInfo.distance}
            </span>
          </div>
          <div className="w-px h-4 bg-blue-200" />
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#838383]" />
            <span className="text-sm text-[#5B6871]">
              ~{routeInfo.duration} by road
            </span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div className="relative w-full h-52 rounded-xl overflow-hidden border border-[#E5E9EB]">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Loading overlay */}
        {loading && !error && (
          <div className="absolute inset-0 bg-[#F5F5F5] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#838383]">Loading map...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 bg-[#F5F5F5] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <AlertCircle size={20} className="text-[#B0B7C3]" />
              <p className="text-xs text-[#838383]">
                Could not load map for these locations
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
