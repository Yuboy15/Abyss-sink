# ABYSS V11.4 — Experimental structural-string solver

- Uses independently moving structural material points connected by breakable distance strings.
- Links are removed when cuts destroy material between their endpoints.
- Near qualifying cuts, strained links fatigue and can sever neighboring hull material.
- Adds load response from flooding and immersion, with damped motion to reduce bounce.
- Keeps rigid texture patches rather than stretching full images.
- The legacy body solver still handles large-body buoyancy, collision and final separation. This is **not** a complete replacement or exact Floating Sandbox reproduction.
- Renames the diagnostic Mesh view to Strings.
