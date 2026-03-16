"""Load and parse YAML detection rules."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


def load_rules(rules_dir: str) -> list[dict[str, Any]]:
    """Load all YAML rule files from the rules directory."""
    rules: list[dict] = []
    rules_path = Path(rules_dir)

    if not rules_path.exists():
        print(f"[RulesLoader] Rules directory not found: {rules_dir}")
        return rules

    for yml_file in rules_path.glob("*.yml"):
        try:
            with open(yml_file) as f:
                data = yaml.safe_load(f)
            if data and "rules" in data:
                for rule in data["rules"]:
                    rule["_source_file"] = yml_file.name
                    rules.append(rule)
                print(f"[RulesLoader] Loaded {len(data['rules'])} rules from {yml_file.name}")
        except (yaml.YAMLError, OSError) as e:
            print(f"[RulesLoader] Error loading {yml_file}: {e}")

    print(f"[RulesLoader] Total rules loaded: {len(rules)}")
    return rules
