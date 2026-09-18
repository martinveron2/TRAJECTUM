# UTN-FRH-G07 CAD seed

`TRAJECTUM_G07_BODY_SEED.dxf` is a millimetre 2D closed outer profile: exact tangent-ogive nose (180 mm), 63 mm body diameter, 860 mm total length. Import into a Fusion sketch and Revolve around the centerline; then Shell to the selected wall thickness.

The fin planform is intentionally not embedded until FIN_TIP, FIN_SWEEP and FIN_X are frozen. `TRAJECTUM_G07_PARAMETERS.csv` is the parameter manifest used by TRAJECTUM/Fusion automation; it is not claimed as a native Fusion CSV importer by itself.
