# ABYSS V11.3 — Breakable Spring Structure and Rigid Texture Rendering

## Structural model
- A second layer of spring-linked structural points follows each ship's *live* material grid (rather than loose ropes).
- Each ship body contains roughly 450–950 simulation nodes and 1,500–3,500 links depending on its silhouette.
- Links crossing a material cut are removed. Near a substantial, user-qualified cut, overstressed links may fail and cut an additional small physical ligament. Ordinary holes alone still cannot seed this fatigue.
- When the last cells disconnect, existing hull topology creates independent pieces; floodwater, rigging and keel hinges carry forward.

## Visual fix
- Removed shear/stretch rendering of large photo strips. When structures bend or dangle, they render with independent fixed-size, rotated texture pieces; connected but stable areas draw efficiently.
- Each funnel top moves as a rigid textured object rather than becoming a long elastic ribbon.
- Added the bottom **Mesh** toggle to inspect the spring network; keep it off for better mobile performance.

## Verification and limitations
- Browser checks covered all 12 ships, deep cuts, separate moving fragments, JavaScript errors, and the mesh overlay.
- The new spring lattice is a coarse mobile-friendly approximation above the preexisting 2-unit cell material grid; it is **not an exact Floating Sandbox implementation**, nor is it a validated finite-element simulation.
- Physical iPad performance needs checking on the user's device.
