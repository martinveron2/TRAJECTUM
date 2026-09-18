from trajectum_cad import naca4_coordinates


def test_naca0012_generates_symmetric_closed_contour():
    contour = naca4_coordinates("NACA 0012", points_per_side=25)
    assert len(contour) == 49
    assert abs(contour[0][1]) < 1e-6
    assert abs(contour[-1][1]) < 1e-6


def test_naca2412_generates_cambered_contour():
    contour = naca4_coordinates("2412", points_per_side=25)
    ys = [y for _, y in contour]
    assert max(ys) > abs(min(ys))
