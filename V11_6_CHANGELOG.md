# ABYSS V11.6 — Phase 2: distributed structural loads

- Structural string points now receive local forces from compartment water loading and immersion.
- Added per-point seabed constraints to limit downward deformation on contact.
- Preserved the existing connected-material cutting and spring failure logic.
- The legacy rigid-body transport remains as a fallback; this is not yet a full per-particle buoyancy or keel replacement.
- No new claim of exact Floating Sandbox equivalence.
