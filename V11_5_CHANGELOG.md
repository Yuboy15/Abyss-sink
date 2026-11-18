# ABYSS V11.5 — String solver migration, phase 1

- Increased structural constraint iterations from 3 to 7.
- Material points now integrate local inertia and gravity before link constraints, rather than instantly snapping to a body-defined target.
- Reduced target attraction and tightened link extension limits to reduce elastic bouncing.
- Disabled the old funnel sprite-hinge animation for ships with a material-string lattice.
- Kept the old rigid-body keel breakup and buoyancy as a **temporary fallback**; this is not a complete particle-only engine.
- All previous ships, artwork, controls and flooding are retained.

**Experimental:** needs testing on the user's iPad, particularly performance and cut stability.
