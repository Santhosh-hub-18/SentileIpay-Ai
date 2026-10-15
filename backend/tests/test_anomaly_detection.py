import pytest
from backend.app.services.anomaly_service import evaluate_anomaly, CUSTOMER_BASELINES


class TestAnomalyDetection:
    """Tests the statistical anomaly detection module against customer baselines."""

    def test_normal_spending_within_baseline(self):
        """Standard transactions should not trigger behavioral anomaly."""
        # CUST-1001: avg $45.0, std $20.0
        is_anom, z_score, exp = evaluate_anomaly(
            customer_id="CUST-1001",
            amount=50.0,
            hourly_count=1
        )
        assert not is_anom
        assert z_score < 2.5
        assert "Within expected baseline limits" in exp

    def test_excessive_amount_triggers_anomaly(self):
        """Outlier transaction amounts must trigger z-score anomaly (z >= 2.5)."""
        # CUST-1001: avg $45.0, std $20.0. Amount $200 -> z = (200 - 45)/20 = 7.75
        is_anom, z_score, exp = evaluate_anomaly(
            customer_id="CUST-1001",
            amount=200.0,
            hourly_count=1
        )
        assert is_anom
        assert z_score >= 2.5
        assert "Statistically significant deviation" in exp

    def test_compound_velocity_anomaly(self):
        """Moderate amount surge combined with high hourly velocity triggers anomaly."""
        # CUST-1001: avg $45, std $20. Amount $85 -> z = 2.0. Hourly count 4.
        is_anom, z_score, exp = evaluate_anomaly(
            customer_id="CUST-1001",
            amount=85.0,
            hourly_count=4
        )
        assert is_anom
        assert "Compound anomaly" in exp
