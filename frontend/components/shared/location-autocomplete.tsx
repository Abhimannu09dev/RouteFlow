/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, ChevronRight } from "lucide-react";

const NEPAL_BBOX: [number, number, number, number] = [
  80.0586, 26.3478, 88.2015, 30.4227,
];
const NEPAL_CENTER: [number, number] = [84.124, 28.394];

interface LocationRoutePickerProps {
  valueFrom: string;
  valueTo: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  errorFrom?: string;
  errorTo?: string;
}

export default function LocationRoutePicker({
  onFromChange,
  onToChange,
  errorFrom,
  errorTo,
}: LocationRoutePickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const fromContainer = useRef<HTMLDivElement>(null);
  const toContainer = useRef<HTMLDivElement>(null);
  const fromMarker = useRef<any>(null);
  const toMarker = useRef<any>(null);
  const fromCoords = useRef<[number, number] | null>(null);
  const toCoords = useRef<[number, number] | null>(null);

  // Keep latest callbacks in refs so geocoder closures don't go stale
  const onFromChangeRef = useRef(onFromChange);
  const onToChangeRef = useRef(onToChange);
  useEffect(() => {
    onFromChangeRef.current = onFromChange;
  }, [onFromChange]);
  useEffect(() => {
    onToChangeRef.current = onToChange;
  }, [onToChange]);

  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  //  Clear route layer from map
  function clearRoute() {
    const m = mapRef.current;
    if (!m) return;
    if (m.getLayer("route-line")) m.removeLayer("route-line");
    if (m.getLayer("route-line-border")) m.removeLayer("route-line-border");
    if (m.getSource("route")) m.removeSource("route");
  }

  //  Fetch OSRM route & draw blue line
  async function drawRoute(
    from: [number, number],
    to: [number, number],
    mapboxgl: any,
  ) {
    const m = mapRef.current;
    if (!m) return;

    setRouteLoading(true);
    clearRoute();

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
          `${from[0]},${from[1]};${to[0]},${to[1]}` +
          `?overview=full&geometries=geojson`,
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return;

      const route = data.routes[0];

      // Route info
      const distKm = (route.distance / 1000).toFixed(1);
      const hrs = Math.floor(route.duration / 3600);
      const mins = Math.floor((route.duration % 3600) / 60);
      setRouteInfo({
        distance: `${distKm} km`,
        duration: hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`,
      });

      // Draw route — white border + blue line
      m.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        },
      });

      m.addLayer({
        id: "route-line-border",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.6,
        },
      });

      m.addLayer({
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

      // Fit map to route
      const coords: [number, number][] = route.geometry.coordinates;
      const bounds = coords.reduce(
        (b: any, c: any) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0]),
      );
      m.fitBounds(bounds, { padding: 70, maxZoom: 14 });
    } catch {
      // OSRM failed silently — markers still visible
    } finally {
      setRouteLoading(false);
    }
  }

  //  Init Mapbox map + geocoders ─
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    let fromGeocoder: any;
    let toGeocoder: any;
    let destroyed = false;

    (async () => {
      const [{ default: mapboxgl }, { default: MapboxGeocoder }] =
        await Promise.all([
          import("mapbox-gl"),
          import("@mapbox/mapbox-gl-geocoder"),
          import("mapbox-gl/dist/mapbox-gl.css" as any),
          import(
            "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" as any
          ),
        ]);

      if (destroyed) return;

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: NEPAL_CENTER,
        zoom: 6,
        minZoom: 5,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapRef.current = map;

      //  Helper: make a teardrop marker element
      function makeMarkerEl(color: string) {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 28px; height: 28px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          border: 3px solid #fff;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px ${color}66;
          cursor: pointer;
        `;
        return el;
      }

      //  FROM geocoder ─
      fromGeocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        bbox: NEPAL_BBOX,
        countries: "np",
        placeholder: "Search pickup location...",
        mapboxgl: mapboxgl as any,
        marker: false,
        flyTo: false,
      });

      fromGeocoder.addTo(fromContainer.current!);

      fromGeocoder.on("result", (e: any) => {
        const [lng, lat]: [number, number] = e.result.center;
        fromCoords.current = [lng, lat];
        onFromChangeRef.current(
          e.result.text || e.result.place_name.split(",")[0],
        );

        fromMarker.current?.remove();
        fromMarker.current = new mapboxgl.Marker({
          element: makeMarkerEl("#2563eb"),
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 28 }).setHTML(
              `<p style="font-size:13px;font-weight:600;margin:0">📍 Pickup</p>
               <p style="font-size:12px;color:#555;margin:4px 0 0">${e.result.text}</p>`,
            ),
          )
          .addTo(map);

        if (toCoords.current) {
          drawRoute([lng, lat], toCoords.current, mapboxgl);
        } else {
          map.flyTo({ center: [lng, lat], zoom: 10, speed: 1.4 });
        }
      });

      fromGeocoder.on("clear", () => {
        fromCoords.current = null;
        onFromChangeRef.current("");
        fromMarker.current?.remove();
        fromMarker.current = null;
        setRouteInfo(null);
        clearRoute();
      });

      //  TO geocoder ─
      toGeocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        bbox: NEPAL_BBOX,
        countries: "np",
        placeholder: "Search delivery location...",
        mapboxgl: mapboxgl as any,
        marker: false,
        flyTo: false,
      });

      toGeocoder.addTo(toContainer.current!);

      toGeocoder.on("result", (e: any) => {
        const [lng, lat]: [number, number] = e.result.center;
        toCoords.current = [lng, lat];
        onToChangeRef.current(
          e.result.text || e.result.place_name.split(",")[0],
        );

        toMarker.current?.remove();
        toMarker.current = new mapboxgl.Marker({
          element: makeMarkerEl("#dc2626"),
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 28 }).setHTML(
              `<p style="font-size:13px;font-weight:600;margin:0">🏁 Delivery</p>
               <p style="font-size:12px;color:#555;margin:4px 0 0">${e.result.text}</p>`,
            ),
          )
          .addTo(map);

        if (fromCoords.current) {
          drawRoute(fromCoords.current, [lng, lat], mapboxgl);
        } else {
          map.flyTo({ center: [lng, lat], zoom: 10, speed: 1.4 });
        }
      });

      toGeocoder.on("clear", () => {
        toCoords.current = null;
        onToChangeRef.current("");
        toMarker.current?.remove();
        toMarker.current = null;
        setRouteInfo(null);
        clearRoute();
      });
    })();

    return () => {
      destroyed = true;
      fromGeocoder?.onRemove?.();
      toGeocoder?.onRemove?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/*  Geocoder inputs  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#5B6871] mb-1.5 flex items-center gap-1 block">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Pickup Location <span className="text-red-400 ml-0.5">*</span>
          </label>
          <div ref={fromContainer} className="geocoder-wrap geocoder-from" />
          {errorFrom && (
            <p className="text-xs text-red-400 mt-1">{errorFrom}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-[#5B6871] mb-1.5 flex items-center gap-1 block">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Delivery Location <span className="text-red-400 ml-0.5">*</span>
          </label>
          <div ref={toContainer} className="geocoder-wrap geocoder-to" />
          {errorTo && <p className="text-xs text-red-400 mt-1">{errorTo}</p>}
        </div>
      </div>

      {/*  Route summary  */}
      {(routeInfo || routeLoading) && (
        <div className="flex items-center gap-4 px-4 py-3 bg-blue-50 rounded-xl border border-blue-200">
          {routeLoading ? (
            <p className="text-xs text-blue-500 animate-pulse">
              Calculating route...
            </p>
          ) : routeInfo ? (
            <>
              <div className="flex items-center gap-1.5">
                <Navigation2 size={13} className="text-blue-600" />
                <span className="text-sm font-semibold text-[#252C32]">
                  {routeInfo.distance}
                </span>
              </div>
              <ChevronRight size={13} className="text-gray-300" />
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-[#838383]" />
                <span className="text-sm text-[#5B6871]">
                  ~{routeInfo.duration} by road
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/*  Map  */}
      <div
        ref={mapContainer}
        className="w-full h-72 rounded-xl overflow-hidden border border-[#E5E9EB] shadow-sm"
      />

      {/*  Geocoder style overrides  */}
      <style>{`
        .geocoder-wrap .mapboxgl-ctrl-geocoder {
          width: 100% !important;
          max-width: 100% !important;
          box-shadow: none !important;
          border: 1px solid #E5E9EB !important;
          border-radius: 12px !important;
          background: #F5F5F5 !important;
          font-family: inherit !important;
          font-size: 14px !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder input {
          background: transparent !important;
          font-size: 13px !important;
          color: #252C32 !important;
          padding: 10px 36px 10px 36px !important;
          height: auto !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder input::placeholder {
          color: #B0B7C3 !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--icon-search {
          top: 10px !important;
          left: 10px !important;
          fill: #B0B7C3 !important;
          width: 16px !important;
          height: 16px !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--button {
          background: transparent !important;
          top: 6px !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestions {
          border-radius: 12px !important;
          border: 1px solid #E5E9EB !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;
          margin-top: 4px !important;
          overflow: hidden !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion {
          padding: 10px 14px !important;
          font-size: 13px !important;
          color: #252C32 !important;
          border-bottom: 1px solid #F5F5F5 !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion:hover,
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion.active {
          background: #EFF6FF !important;
          color: #2563eb !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion-title {
          font-weight: 600 !important;
        }
        .geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion-address {
          color: #838383 !important;
          font-size: 11px !important;
        }
        /* focus ring */
        .geocoder-from .mapboxgl-ctrl-geocoder:focus-within {
          border-color: #2563eb !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
        }
        .geocoder-to .mapboxgl-ctrl-geocoder:focus-within {
          border-color: #dc2626 !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.10) !important;
        }
      `}</style>
    </div>
  );
}
