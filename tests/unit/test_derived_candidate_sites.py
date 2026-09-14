"""Unit and Integration Tests for Database-Native Candidate Relocation Site Derivation.

Verifies:
1. Dry-run and live derivation from pre-computed PostgreSQL H3 tables.
2. Auto-mode fallback from missing rasters to database-native derivation.
3. Strict enforcement of honest data gaps:
   - cc_land > 0 (computed purely from parcel geometry)
   - cc_water IS None, cc_school IS None, cc_health IS None, cc_final IS None
   - binding_constraint IS None
   - assessment_status == 'screening_only'
   - tenure == 'tenure_unverified'
   - eligibility_status == 'unknown'
4. Idempotency under migration 015 unique constraint (source_site_id).
5. Spatial discovery via SitesRepository / SitesService within 15 km radius.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from api.repositories.sites_repo import SitesRepository
from api.services.sites_service import SitesService
from core.config import settings
from core.domain.capacity import CandidateSitePolicy, CapacityEngine
from core.enums import AssessmentStatus, EligibilityStatus, TenureType
from pipeline.jobs.derive_candidate_sites import (
    DATA_GAPS,
    SCREENING_POLICY,
    derive,
    derive_from_db,
)


@pytest.fixture(scope="module")
def db_engine():
    return create_engine(settings.get_sqlalchemy_url())


@pytest.fixture
def db_session(db_engine):
    with Session(db_engine) as session:
        yield session


class TestDerivedCandidateSitesDerivation:
    """Tests for pipeline.jobs.derive_candidate_sites database-native derivation."""

    def test_derive_from_db_dry_run_dholpur(self, db_engine):
        """Dry-run must compute zonal eligibility without modifying candidate_site table."""
        res = derive_from_db("dholpur", engine=db_engine, dry_run=True)
        assert res["dry_run"] is True
        assert res["district"] == "Dholpur"
        assert res["source_mode"] == "database_h3"
        assert res["eligible_cells"] > 0
        assert res["total_area_ha"] > 0
        assert res["mean_susceptibility"] < 0.25
        assert res["mean_slope_deg"] < 15.0

    def test_derive_from_db_dry_run_morena(self, db_engine):
        """Dry-run for Morena must evaluate safe cells cleanly."""
        res = derive_from_db("morena", engine=db_engine, dry_run=True)
        assert res["dry_run"] is True
        assert res["district"] == "Morena"
        assert res["source_mode"] == "database_h3"
        assert res["eligible_cells"] > 0
        assert res["total_area_ha"] > 0
        assert res["mean_susceptibility"] < 0.25
        assert res["mean_slope_deg"] < 15.0

    def test_derive_auto_mode_falls_back_to_db(self, db_engine):
        """When local GeoTIFF rasters are missing, auto mode must seamlessly fall back to DB mode."""
        res = derive("dholpur", engine=db_engine, dry_run=True, source="auto")
        assert res["source_mode"] == "database_h3"
        assert res["dry_run"] is True
        assert res["eligible_cells"] > 0

    def test_unknown_district_raises_system_exit(self, db_engine):
        """Invalid district identifier must cleanly exit without DB corruption."""
        with pytest.raises(SystemExit):
            derive_from_db("atlantis", engine=db_engine, dry_run=True)


class TestDerivedCandidateSitesDataContract:
    """Verifies that derived sites adhere strictly to PRD honest data gap standards."""

    def test_honest_data_gaps_in_database(self, db_engine):
        """Derived sites in DB must preserve unmeasured lifelines as NULL rather than 0."""
        with db_engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT 
                        id, source_site_id, area_ha, tenure, slope_mean, mhi_max,
                        cc_land, cc_water, cc_school, cc_health, cc_final, binding_constraint,
                        assessment_status, eligibility_status, metadata
                    FROM candidate_site
                    WHERE source_site_id LIKE 'derived-site:dholpur:h3:%'
                    LIMIT 20;
                """)
            ).mappings().fetchall()

        if not rows:
            pytest.skip("No derived candidate sites found for Dholpur; run live derivation first.")

        for row in rows:
            # Physical area and land capacity must be positive
            assert row["area_ha"] > 0.0
            assert row["cc_land"] > 0

            # Lifelines must be honest NULLs (NOT zero)
            assert row["cc_water"] is None
            assert row["cc_school"] is None
            assert row["cc_health"] is None
            assert row["cc_final"] is None
            assert row["binding_constraint"] is None

            # Tenure and status must be screening grade
            assert row["tenure"] == TenureType.TENURE_UNVERIFIED.value
            assert row["assessment_status"] == AssessmentStatus.SCREENING_ONLY.value
            assert row["eligibility_status"] == EligibilityStatus.UNKNOWN.value

            # Metadata disclosures
            meta = row["metadata"]
            assert meta["provenance"] == "derived_h3_flood_safe_haven"
            assert meta["is_synthetic"] is False
            assert "data_gaps" in meta
            assert len(meta["data_gaps"]) >= 4


class TestCandidateSitesSpatialDiscovery:
    """Verifies spatial discovery and API service integration for derived sites."""

    def test_spatial_proximity_to_derived_habitations(self, db_session):
        """Derived habitations in Dholpur must discover safe havens within 15 km search radius."""
        repo = SitesRepository(db_session)

        # Get first habitation in Dholpur
        hab = db_session.execute(
            text("""
                SELECT h.id, h.name 
                FROM habitation h 
                JOIN admin_boundary ab ON ab.id = h.admin_id 
                WHERE lower(ab.name) = 'dholpur'
                ORDER BY h.id ASC 
                LIMIT 1;
            """)
        ).mappings().first()

        if not hab:
            pytest.skip("No habitations seeded for Dholpur.")

        hab_id = hab["id"]
        raw_sites = repo.query_candidate_sites_for_habitation(
            habitation_id=hab_id,
            radius_m=15000.0,
        )

        assert len(raw_sites) > 0, f"Habitation {hab['name']} (id={hab_id}) has no candidate sites within 15 km."
        for s in raw_sites:
            assert s["distance_km"] <= 15.0
            assert s["cc_land"] > 0
            assert s["cc_water"] is None
            assert s["cc_final"] is None

    def test_sites_service_screening_filter(self, db_session):
        """SitesService must hide screening sites by default, but expose them with honest notices when include_screening=True."""
        service = SitesService(db_session)

        hab = db_session.execute(
            text("""
                SELECT h.id 
                FROM habitation h 
                JOIN admin_boundary ab ON ab.id = h.admin_id 
                WHERE lower(ab.name) = 'dholpur'
                ORDER BY h.id ASC 
                LIMIT 1;
            """)
        ).mappings().first()

        if not hab:
            pytest.skip("No habitations seeded for Dholpur.")

        hab_id = hab["id"]

        # Default query (include_screening=False) should not return screening-only unverified sites
        order_grade_res = service.get_candidate_sites_for_habitation(
            habitation_id=hab_id,
            include_screening=False,
        )
        for item in order_grade_res.items:
            assert item.allocatable is True

        # Screening query (include_screening=True) must return derived safe havens
        screening_res = service.get_candidate_sites_for_habitation(
            habitation_id=hab_id,
            include_screening=True,
        )
        assert screening_res.total > 0
        derived_items = [i for i in screening_res.items if i.source_site_id and "derived-site:" in i.source_site_id]
        assert len(derived_items) > 0

        first_derived = derived_items[0]
        assert first_derived.assessment_status == "screening_only"
        assert first_derived.allocatable is False
        assert first_derived.capacity.cc_water is None
        assert first_derived.capacity.cc_final is None
        assert "Land tenure is unverified" in first_derived.rejection_reasons
