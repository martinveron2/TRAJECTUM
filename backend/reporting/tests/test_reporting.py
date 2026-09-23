import pytest

from trajectum_reporting import EngineeringReport, Evidence, ReportSection, render_markdown


def test_report_preserves_traceability_chain():
    evidence = Evidence(
        result="CG = TBD",
        model="mass-weighted moment",
        inputs=("component masses", "component x positions"),
        source="UTN G07 CDR baseline",
        assumptions=("nose-tip datum",),
        validity="rigid vehicle",
        version="0.1",
        test="unit-test",
    )
    report = EngineeringReport(
        title="CDR",
        phase="CDR",
        sections=(ReportSection("Mass properties", "Working section.", (evidence,)),),
    )
    text = render_markdown(report)
    assert "Result: CG = TBD" in text
    assert "Model: mass-weighted moment" in text
    assert "Source: UTN G07 CDR baseline" in text


@pytest.mark.parametrize("missing", ["model", "source", "validity", "version", "test"])
def test_incomplete_evidence_cannot_be_rendered(missing):
    values = {
        "result": "CG = pending",
        "model": "mass-weighted moment",
        "inputs": ("vehicle.cdr.json@sha256:fixture",),
        "source": "UTN G07 CDR baseline",
        "assumptions": ("nose-tip datum",),
        "validity": "rigid vehicle",
        "version": "0.1",
        "test": "unit-test",
    }
    values[missing] = ""
    with pytest.raises(ValueError):
        Evidence(**values)


def test_report_requires_content():
    with pytest.raises(ValueError):
        EngineeringReport(title="CDR", phase="CDR", sections=())
