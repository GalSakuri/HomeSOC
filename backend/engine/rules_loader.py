"""Load and parse YAML detection rules."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("homesoc.rules_loader")


def load_rules(rules_dir: str) -> list[dict[str, Any]]:
    """Load all YAML rule files from the rules directory."""
    rules: list[dict] = []
    rules_path = Path(rules_dir)

    if not rules_path.exists():
        logger.warning("Rules directory not found: %s", rules_dir)
        return rules

    for yml_file in rules_path.glob("*.yml"):
        try:
            with open(yml_file) as f:
                data = yaml.safe_load(f)
            if data and "rules" in data:
                for rule in data["rules"]:
                    rule["_source_file"] = yml_file.name
                    rules.append(rule)
                logger.info("Loaded %d rules from %s", len(data["rules"]), yml_file.name)
        except (yaml.YAMLError, OSError) as e:
            logger.error("Error loading %s: %s", yml_file, e)

    logger.info("Total rules loaded: %d", len(rules))
    return rules
