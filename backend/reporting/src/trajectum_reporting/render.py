from __future__ import annotations

from .models import EngineeringReport


def render_markdown(report: EngineeringReport) -> str:
    lines = [f"# {report.title}", "", f"Phase: **{report.phase}**", ""]
    for section in report.sections:
        lines.extend([f"## {section.title}", "", section.body, ""])
        for item in section.evidence:
            lines.extend([
                "### Evidence",
                f"- Result: {item.result}",
                f"- Model: {item.model}",
                f"- Inputs: {', '.join(item.inputs)}",
                f"- Source: {item.source}",
                f"- Assumptions: {', '.join(item.assumptions) or 'None declared'}",
                f"- Validity: {item.validity or 'Not specified'}",
                f"- Version: {item.version or 'Not specified'}",
                f"- Test: {item.test or 'Not specified'}",
                "",
            ])
    return "\n".join(lines).rstrip() + "\n"
