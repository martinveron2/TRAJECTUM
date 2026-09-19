from trajectum_core import UTN_FRH_2026_REQUIREMENTS


def test_utn_frh_2026_requirement_matrix_contract():
    assert len(UTN_FRH_2026_REQUIREMENTS) == 11
    assert [item.id for item in UTN_FRH_2026_REQUIREMENTS] == [f"R{i}" for i in range(1, 12)]
    assert UTN_FRH_2026_REQUIREMENTS[0].methods == ("A", "E")
    assert UTN_FRH_2026_REQUIREMENTS[-1].target == "2x Franjas Reflectivas"
