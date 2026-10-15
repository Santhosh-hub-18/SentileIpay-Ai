import os
import pytest
from fastapi.testclient import TestClient


class TestFrontendServing:
    """Verifies that the single deployable FastAPI server serves the compiled React SPA."""

    def test_root_serves_spa_html(self, client: TestClient):
        """Requesting / returns status 200 with index.html containing the React root."""
        res = client.get("/")
        assert res.status_code == 200
        assert "<div id=\"root\"></div>" in res.text
        assert "FraudShield" in res.text

    def test_static_assets_mounted(self, client: TestClient):
        """Static JS and CSS bundles in dist/assets must be accessible via /assets/."""
        dist_assets = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "assets")
        if os.path.exists(dist_assets):
            files = [f for f in os.listdir(dist_assets) if f.endswith(('.js', '.css'))]
            assert len(files) > 0, "Expected compiled asset files in dist/assets"

            asset_file = files[0]
            res = client.get(f"/assets/{asset_file}")
            assert res.status_code == 200
            assert len(res.content) > 0

    def test_api_routes_not_intercepted_by_spa(self, client: TestClient):
        """API routes under /api must continue to return JSON and not SPA HTML."""
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

        docs_res = client.get("/docs")
        assert docs_res.status_code == 200
