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
