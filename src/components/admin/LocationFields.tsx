"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Hidden position fields for any form the campus fence guards.
 *
 * The browser is asked for a position on mount and the answer is posted as
 * three ordinary form fields. It is NOT asked for a verdict: the server does
 * the trigonometry, against the campus pin the client never sees. All this
 * component can do is supply a position or fail to, and both are handled
 * server-side in the attendance actions.
 *
 * Failure is deliberately not hidden. A teacher who blocked the permission
 * needs to know that before they tap Save, not after the server refuses —
 * so the state is on screen with a way to ask again.
 */

type State =
  | { status: "asking" }
  | { status: "ok"; lat: number; lng: number; accuracyM: number }
  | { status: "error"; message: string };

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  // A fix from the last minute is good enough and returns instantly. Forcing a
  // cold GPS lock on every render would make the button feel broken indoors.
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
  // Lazy initial state rather than an effect that immediately sets it: the
  // "asking" and unsupported cases are known before the first paint, and
  // setting them from inside the effect is a cascading render for nothing.
  const [state, setState] = useState<State>(() =>
    supported()
      ? { status: "asking" }
      : { status: "error", message: "This browser can't report a location." },
  );

  // Only ever called from an async callback or a click, never synchronously
  // from the effect body.
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
