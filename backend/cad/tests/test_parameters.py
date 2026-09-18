from trajectum_cad import CDR_PARAMETERS, export_fusion_csv, unresolved_parameters


def test_current_cdr_parameter_contract_contains_frozen_geometry():
    params = {item.name: item for item in CDR_PARAMETERS}
    assert params["L_TOTAL"].value == 860.0
    assert params["D_EXT"].value == 63.0
    assert params["L_NOSE"].status == "frozen"


def test_unknown_fin_geometry_is_not_silently_invented():
    unresolved = unresolved_parameters()
    assert "FIN_TIP" in unresolved
    assert "FIN_SWEEP" in unresolved
    assert "FIN_X" in unresolved


def test_fusion_export_leaves_tbd_expressions_blank(tmp_path):
    output = export_fusion_csv(tmp_path / "parameters.csv")
    text = output.read_text(encoding="utf-8")
    assert "FIN_TIP,,mm,tbd" in text
