"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type State =
  | { status: "asking" }
  | { status: "ok"; lat: number; lng: number; accuracyM: number }
  | { status: "error"; message: string };

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

function messageFor(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Location permission is blocked. Allow it for this site in your browser settings, then try again.";
  }
  if (err.code === err.TIMEOUT) {
    return "Couldn't get a location in time. Move near a window and try again.";
  }
  return "Your device couldn't provide a location right now.";
}

function supported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function LocationFields({ label = "Location" }: { label?: string }) {
  const [state, setState] = useState<State>(() =>
    supported()
      ? { status: "asking" }
      : { status: "error", message: "This browser can't report a location." },
  );

  const request = useCallback(() => {
    if (!supported()) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy),
        }),
      (err) => setState({ status: "error", message: messageFor(err) }),
      OPTIONS,
    );
  }, []);

  const retry = useCallback(() => {
    setState({ status: "asking" });
    request();
  }, [request]);

  useEffect(() => {
    request();
  }, [request]);

  return (
    <>
      {state.status === "ok" && (
        <>
          <input type="hidden" name="lat" value={state.lat} />
          <input type="hidden" name="lng" value={state.lng} />
          <input type="hidden" name="accuracyM" value={state.accuracyM} />
        </>
      )}

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink/55" aria-live="polite">
        {state.status === "asking" && (
          <>
            <Icon name="my_location" className="animate-pulse text-[15px] text-emerald" />
            Checking {label.toLowerCase()}…
          </>
        )}
        {state.status === "ok" && (
          <>
            <Icon name="my_location" className="text-[15px] text-emerald" />
            {label} found, accurate to about {state.accuracyM} m.
          </>
        )}
        {state.status === "error" && (
          <>
            <Icon name="location_off" className="text-[15px] text-red-600" />
            <span className="text-red-700">{state.message}</span>
            <button
              type="button"
              onClick={retry}
              className="font-semibold text-emerald underline underline-offset-2 hover:text-emerald-deep"
            >
              Try again
            </button>
          </>
        )}
      </p>
    </>
  );
}
