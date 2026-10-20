import { useEffect, useRef, useState } from "react";
import { GAME_IDS, type GameId } from "../games/meta";

export type Route =
  | { page: "home" }
  | { page: "play"; game: GameId }
  | { page: "leaderboard"; game: GameId }
  | { page: "prizes" }
  | { page: "profile"; id: string | null }
  | { page: "settings" };

function parse(): Route {
  const [a, b] = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const game = (GAME_IDS as string[]).includes(b) ? (b as GameId) : "flap";
  if (a === "play") return { page: "play", game };
  if (a === "leaderboard") return { page: "leaderboard", game };
  if (a === "prizes") return { page: "prizes" };
  if (a === "profile") return { page: "profile", id: b ? decodeURIComponent(b) : null };
  if (a === "settings") return { page: "settings" };
  return { page: "home" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  const prev = useRef(route.page);

  useEffect(() => {
    const onHash = () => {
      const next = parse();
      if (next.page !== prev.current) window.scrollTo({ top: 0 });
      prev.current = next.page;
      setRoute(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}
