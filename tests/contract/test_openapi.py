"""Contract tests for OpenAPI schema generation and export."""

import json
from pathlib import Path
import pytest
from api.main import app


class TestOpenAPIContract:
    def test_generate_and_save_openapi_schema(self):
        openapi_schema = app.openapi()
        assert openapi_schema is not None
        assert "paths" in openapi_schema
        assert "components" in openapi_schema

        paths = openapi_schema["paths"]
        assert "/zones" in paths
        assert "/zones/{h3}" in paths
        assert "/habitations" in paths
        assert "/habitations/{id}/risk" in paths
        assert "/health/live" in paths

        # Save openapi.json to workspace root for frontend type generation
        root_path = Path(__file__).resolve().parents[2]
        openapi_file = root_path / "openapi.json"

        with open(openapi_file, "w", encoding="utf-8") as f:
            json.dump(openapi_schema, f, indent=2)

        assert openapi_file.exists()
        assert openapi_file.stat().st_size > 1000
