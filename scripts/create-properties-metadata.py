#!/usr/bin/env python3
"""Create lightweight properties metadata for the Next.js frontend.

This script extracts UI-focused fields from properties_enhanced.json and writes
properties_metadata.json for bundle-size reduction.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def normalize_uom(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def is_categorical_property(prop: dict[str, Any]) -> bool:
    uom = normalize_uom(prop.get("propuom"))
    if not uom or uom == "null":
        return True
    return uom in {"code", "choice", "class"}


def extract_choices_from_evaluations(propname: str, evaluations: list[dict[str, Any]]) -> list[str]:
    choices: set[str] = set()

    for evaluation in evaluations:
        if evaluation.get("propname") != propname:
            continue

        expression = evaluation.get("crispExpression")
        if not expression or not isinstance(expression, str):
            continue

        expr = expression.strip()

        simple_match = re.match(r'^=\s*"([^"]+)"$', expr)
        if simple_match:
            choices.add(simple_match.group(1))
            continue

        or_match = re.match(r'^=\s*"([^"]+)"\s+or\s+"([^"]+)"$', expr, re.IGNORECASE)
        if or_match:
            choices.add(or_match.group(1))
            choices.add(or_match.group(2))
            continue

        for quoted in re.findall(r'"([^"]+)"', expr):
            choices.add(quoted)

    return sorted(choices)


def build_metadata(
    properties: list[dict[str, Any]], evaluations: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    metadata: list[dict[str, Any]] = []

    for prop in properties:
        propid = prop.get("propiid")
        propname = prop.get("propname")

        if propid is None or propname is None:
            continue

        is_categorical = is_categorical_property(prop)
        choices = extract_choices_from_evaluations(str(propname), evaluations) if is_categorical else []

        metadata.append(
            {
                "propid": int(propid),
                "propname": propname,
                "propuom": prop.get("propuom"),
                "propmin": prop.get("propmin"),
                "propmax": prop.get("propmax"),
                "isCategorical": is_categorical,
                "choices": choices,
                "description": prop.get("propdesc"),
                "category": prop.get("category"),
            }
        )

    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate properties_metadata.json")
    parser.add_argument(
        "--properties",
        default="python-interp-service/data/properties_enhanced.json",
        help="Path to source properties_enhanced.json",
    )
    parser.add_argument(
        "--evaluations",
        default="interp-engine-app/src/data/evaluations.json",
        help="Path to evaluations.json",
    )
    parser.add_argument(
        "--output",
        default="interp-engine-app/src/data/properties_metadata.json",
        help="Output path for properties_metadata.json",
    )
    args = parser.parse_args()

    properties_path = Path(args.properties)
    evaluations_path = Path(args.evaluations)
    output_path = Path(args.output)

    with properties_path.open("r", encoding="utf-8") as f:
        properties = json.load(f)

    with evaluations_path.open("r", encoding="utf-8") as f:
        evaluations = json.load(f)

    metadata = build_metadata(properties, evaluations)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    source_size = properties_path.stat().st_size
    output_size = output_path.stat().st_size
    reduction = (1 - (output_size / source_size)) * 100 if source_size else 0

    print(f"Wrote {len(metadata)} properties to {output_path}")
    print(f"Source size: {source_size / (1024 * 1024):.2f} MB")
    print(f"Output size: {output_size / (1024 * 1024):.2f} MB")
    print(f"Reduction: {reduction:.1f}%")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
