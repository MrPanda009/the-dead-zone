"""Shared CLI and on-disk layout for the step-by-step Milestone A–E runners.

Every runner takes a registered district key as its first argument:

    uv run python -m pipeline.hazard.flood.run_milestone_a <district>

and derives all district-specific values (bbox, CRS, names, S1 window) from the
`DistrictConfig` in `districts.py`. `MilestonePaths` fixes where each milestone
writes and where the next one reads, keyed by the district's file prefix, so
milestones for different districts never overwrite each other.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from core.config import REPO_ROOT

from .districts import DISTRICTS, DistrictConfig, get_district


def build_parser(description: str) -> argparse.ArgumentParser:
    """Argument parser with the positional `district` argument every milestone takes."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "district",
        type=str.lower,
        choices=sorted(DISTRICTS),
        help="Registered district key (see pipeline/hazard/flood/districts.py).",
    )
    return parser


def resolve_district(args: argparse.Namespace) -> DistrictConfig:
    return get_district(args.district)


def print_banner(title: str, cfg: DistrictConfig, task: str | None = None, width: int = 75) -> None:
    print("=" * width)
    print(f"SETU-DRR: Flood Susceptibility Pipeline - {title}")
    print(f"District: {cfg.name}, {cfg.state} ({cfg.river_basin}) | LGD {cfg.lgd_code}")
    if task:
        print(f"Task: {task}")
    print("=" * width)


@dataclass(frozen=True)
class MilestonePaths:
    """Canonical input/output locations for one district's milestone runs."""

    district: DistrictConfig
    root: Path = REPO_ROOT

    def _layer(self, directory: Path, layer: str, suffix: str) -> Path:
        return directory / f"{self.district.file_prefix}_{layer}{suffix}"

    @property
    def boundary_geojson(self) -> Path:
        return self.root / "data" / "raw" / "boundaries" / f"{self.district.key}.geojson"

    @property
    def water_masks_dir(self) -> Path:
        return self.root / "data" / "interim" / "water_masks"

    @property
    def frequency_dir(self) -> Path:
        return self.root / "data" / "interim" / "frequency"

    @property
    def hand_dir(self) -> Path:
        return self.root / "data" / "interim" / "hand"

    @property
    def susceptibility_dir(self) -> Path:
        return self.root / "data" / "interim" / "susceptibility"

    @property
    def flood_interim_dir(self) -> Path:
        return self.root / "data" / "interim" / "flood" / self.district.key

    @property
    def population_raster(self) -> Path:
        return self.root / "data" / "interim" / "exposure" / f"{self.district.key}_worldpop_100m.tif"

    @property
    def processed_dir(self) -> Path:
        return self.root / "data" / "processed" / "flood" / self.district.key

    def frequency(self, layer: str, suffix: str = ".tif") -> Path:
        return self._layer(self.frequency_dir, layer, suffix)

    def hand(self, layer: str, suffix: str = ".tif") -> Path:
        return self._layer(self.hand_dir, layer, suffix)

    def susceptibility(self, layer: str, suffix: str = ".tif") -> Path:
        return self._layer(self.susceptibility_dir, layer, suffix)

    @property
    def frequency_meta(self) -> Path:
        """Milestone B run record (scene count, window, threshold) read by Milestones D/E."""
        return self.frequency("frequency_meta", ".json")

    def read_frequency_meta(self) -> dict[str, Any]:
        """Return Milestone B's run record, or {} if B predates the record."""
        if not self.frequency_meta.exists():
            print(f"  [!] {self.frequency_meta.name} not found; Sentinel-1 provenance will be null. "
                  f"Re-run Milestone B for {self.district.key} to record it.")
            return {}
        return json.loads(self.frequency_meta.read_text())


def require_inputs(*paths: Path, produced_by: str, district: DistrictConfig) -> None:
    """Fail with the command that produces any missing upstream artifact."""
    missing = [p for p in paths if not p.exists()]
    if missing:
        listing = "\n".join(f"  - {p}" for p in missing)
        raise FileNotFoundError(
            f"Missing inputs for {district.name}:\n{listing}\n"
            f"Run: uv run python -m pipeline.hazard.flood.{produced_by} {district.key}"
        )
