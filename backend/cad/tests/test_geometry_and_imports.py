from trajectum_cad import classify_cad_filename, tangent_ogive_profile


def test_tangent_ogive_hits_tip_and_base_radius():
    points = tangent_ogive_profile(length_mm=180.0, base_radius_mm=31.5, stations=21)
    assert len(points) == 21
    assert abs(points[0][1]) < 1e-9
    assert abs(points[-1][0] - 180.0) < 1e-9
    assert abs(points[-1][1] - 31.5) < 1e-9


def test_cad_format_registry_classifies_common_files():
    assert classify_cad_filename('rocket.step').name == 'STEP'
    assert classify_cad_filename('rocket.f3d').name == 'Fusion 360'
    assert classify_cad_filename('rocket.ipt').name == 'Inventor'
    assert classify_cad_filename('rocket.stl').representation == 'triangle mesh'
    assert classify_cad_filename('rocket.txt') is None
