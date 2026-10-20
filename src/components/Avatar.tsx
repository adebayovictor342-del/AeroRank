import { cn } from "../utils/cn";

interface Props {
  /** uploaded photo, if any */
  avatar?: string | null;
  /** emoji used when there is no photo (rival players) */
  face?: string;
  name: string;
  size: number;
  /** gradient ring, Facebook-style */
  ring?: boolean;
  className?: string;
}

const PALETTE = [
  ["#38d9f5", "#6a8cff"],
  ["#9b87f5", "#e0568a"],
  ["#ffd166", "#ff8a5c"],
  ["#4ade80", "#38d9f5"],
];

/** Photo if there is one, otherwise a generated monogram or the player's emoji. */
export default function Avatar({ avatar, face, name, size, ring = false, className }: Props) {
  const key = name.charCodeAt(0) + name.length;
  const [from, to] = PALETTE[key % PALETTE.length];
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        ring && "p-[3px]",
        className,
      )}
      style={
        ring
          ? { background: "linear-gradient(135deg,#38d9f5,#9b87f5 45%,#ffd166)", width: size, height: size }
          : { width: size, height: size }
      }
    >
      <span
        className={cn("grid h-full w-full place-items-center overflow-hidden rounded-full", ring && "ring-2 ring-ink-950")}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={`${name}'s profile photo`}
            className="h-full w-full object-cover"
            width={size}
            height={size}
            loading="lazy"
          />
        ) : face ? (
          <span style={{ fontSize: Math.round(size * 0.52) }} aria-hidden>
            {face}
          </span>
        ) : (
          <span
            className="font-display font-extrabold text-ink-950"
            style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}
          >
            {(name.trim()[0] || "?").toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}
