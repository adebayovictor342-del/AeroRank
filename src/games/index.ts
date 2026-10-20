import type { Factory } from "./common";
import { createBrick } from "./brick";
import { createClimb } from "./climb";
import { createFlap } from "./flap";
import type { GameId } from "./meta";
import { createSkirmish } from "./skirmish";

export const FACTORIES: Record<GameId, Factory> = {
  skirmish: createSkirmish,
  flap: createFlap,
  brick: createBrick,
  climb: createClimb,
};
