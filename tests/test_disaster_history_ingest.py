"""Tests for disaster history normalization and ingestion."""

import pytest
from pipeline.jobs.ingest_disaster_history import (
    normalize_state_name,
    parse_year_range,
    DisasterHistoryIngestor,
)


def test_normalize_state_name() -> None:
    assert normalize_state_name("Assam") == "Assam"
    assert normalize_state_name("assam ") == "Assam"
    assert normalize_state_name("Orissa*") == "Odisha"
    assert normalize_state_name("Uttarakhand #") == "Uttarakhand"
    assert normalize_state_name("Tamilnadu") == "Tamil Nadu"
    assert normalize_state_name("Jammu and Kashmir") == "Jammu & Kashmir"


def test_parse_year_range() -> None:
    assert parse_year_range("2014-15") == (2014, 2015)
    assert parse_year_range("2019-2020") == (2019, 2020)
    assert parse_year_range("2023") == (2023, 2023)
    assert parse_year_range("invalid") == (2020, 2020)


def test_fixture_loading() -> None:
    ingestor = DisasterHistoryIngestor(session=None)  # session not needed for load_json
    ncrb = ingestor.load_json("ncrb_forces_of_nature.json")
    assert len(ncrb) > 0
    assert any(r["state_name"] == "Assam" for r in ncrb)

    mha = ingestor.load_json("mha_rajya_sabha_losses.json")
    assert len(mha) > 0
    assert any(r["state_name"] == "Rajasthan" for r in mha)

    cwc = ingestor.load_json("cwc_flood_damages.json")
    assert len(cwc) > 0

    cases = ingestor.load_json("case_studies.json")
    assert len(cases) > 0
    assert cases[0]["slug"] == "manipur-noney-landslide-2022"
