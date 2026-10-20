import { Header } from "./components/Header";
import SignupGate from "./components/SignupGate";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Play from "./pages/Play";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Prizes from "./pages/Prizes";
import { useRoute } from "./state/router";

export default function App() {
  const route = useRoute();

  // Game screens are full-screen: no header, no footer, nothing but the game and its controls.
  if (route.page === "play")
    return (
      <>
        <Play key={route.game} game={route.game} />
        <SignupGate />
      </>
    );

  return (
    <div className="aero-bg relative min-h-screen overflow-x-clip">
      <div aria-hidden className="aero-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
      <Header route={route} />
      <main className="relative z-10">
        {route.page === "home" && <Home />}
        {route.page === "leaderboard" && <Leaderboard key={route.game} game={route.game} />}
        {route.page === "prizes" && <Prizes />}
        {route.page === "profile" && <Profile key={route.id ?? "me"} id={route.id} />}
        {route.page === "settings" && <Settings />}
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-[18px] pb-10 text-center text-xs text-slate-600 lg:px-8">
        Resets Monday 00:00 UTC.
      </footer>
      <SignupGate />
    </div>
  );
}
