# Asterlite Refinement Queue

Ideas here are directionally useful, but not ready for `develop-feature`. Move an item into `BACKLOG.md` only after the player value, timing, UI footprint, and smallest safe implementation slice are clear.

## Needs Product Shape

### Run Plan Drawer

Why it is not ready:
- Could become a dashboard that competes with the playfield and the compact mission UI.
- The current first-warp goal already covers the most important early planning path.

Questions:
- Is this a drawer, a tiny status chip, or part of Technologies?
- What decision should the player make after reading it?
- Can it be useful without showing dense stats?

Possible first slice:
- Add a compact "Next reset" line inside Technologies showing crystal progress, estimated cores, and the next affordable technology.

### Achievement Presentation Polish

Why it is not ready:
- Achievements are useful motivation, but they are secondary to making combat and progression feel better.
- A bigger achievement UI risks adding another menu before the core loop feels strong.

Questions:
- Should achievements be a full tab, a recent-unlock feed, or a small bonus summary?
- Which achievement information changes player behavior?
- Do near-complete achievements overlap too much with missions?

Possible first slice:
- Add a small "recent / near" section at the top of the Achievements tab without changing save data.

### Warp Route Specialization

Why it is not ready:
- Specialization is promising, but the first route still needs clearer pacing and stronger identity.
- Adding branches before balance settles could create confusing or fake choices.

Questions:
- What are the first three real playstyles: manual gunner, drone commander, shield tank, crystal miner?
- What tradeoff does each branch create?
- When should branching begin relative to Drone Systems, Boss Beacon, and Spread Battery?

Possible first slice:
- Add one branch after the current early route, with two nodes that support a single identity and no global rebalance.

### Run Modifiers After Warp

Why it is not ready:
- This pushes the game toward roguelite runs, which may be good later but can distract from the idle progression spine.
- The choice screen after reset could interrupt the clean warp flow.

Questions:
- Are modifiers optional, automatic, or chosen after every warp?
- Are they temporary run flavor or a major build strategy?
- How do they avoid punishing casual idle play?

Possible first slice:
- Add one automatically assigned positive modifier after warp and show it as a compact run trait, then decide if choices are needed.

### Sector Events

Why it is not ready:
- Random events could make runs lively, but they need strong readability and timing rules.
- If introduced too early, they may blur the mission, boss, and zone progression signals.

Questions:
- Should events be opportunities, hazards, or both?
- How often should they interrupt normal asteroid clearing?
- What event can be understood in one feed line and one visual cue?

Possible first slice:
- Add a rare rich metallic belt event with a short timer and increased metallic asteroid weight.

### Ship Module Slots

Why it is not ready:
- Modules are another build layer on top of upgrades, technologies, drones, weapons, and skills.
- Mobile input/UI for active modules needs care to avoid crowding combat.

Questions:
- Are modules active buttons, passive equipment, or both?
- Which technology unlocks the first slot?
- What existing system becomes more fun because modules exist?

Possible first slice:
- Add one passive module slot unlocked by a later technology, with no active input.

## Refinement Rules

- Do not move a refinement item into `Ready` until it has a one-pass implementation slice.
- Prefer features that improve playfield clarity, boss moments, zone progression, or guided goals before adding new menu layers.
- Every new UI surface must explain what player decision it enables.
