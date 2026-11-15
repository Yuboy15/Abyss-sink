# ABYSS V11.0 — flooding and lighting repair

- Ship windows now inherit the actual ship section rotation and local flex (including keel hinges), rather than remaining horizontal on the screen.
- Breach inflow uses pressure head and the size of the opening, and cannot exceed the compartment's remaining capacity.
- Watertight door and cut bulkhead transfers use bounded orifice rates. Overtopping begins only above the bulkhead crest and transfers more gradually.
- Funnel-mouth flooding slowed to account for restricted uptake area.
- Pumping reduced to a scale comparable with smaller leaks.
- No changes to the existing ship artwork or hull cut qualification.

**Model limits:** This remains a 2D fluid and buoyancy approximation, not CFD or certified vessel stability. The four-forward-vs-five-compartment Titanic historical result is a reference target but not a validated guarantee in this build.
