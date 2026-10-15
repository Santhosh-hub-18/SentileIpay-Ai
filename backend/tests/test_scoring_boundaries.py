import pytest
from backend.app.services.scoring_engine import (
    get_risk_action_tier,
    scoring_engine,
    DEFAULT_WEIGHTS
)


class TestScoringBoundaries:
    """Tests exact score boundaries, action tiers, and boundary error handling."""

    @pytest.mark.parametrize("score,expected_tier", [
        (0, "NORMAL"),
        (20, "NORMAL"),
        (30, "NORMAL"),
        (31, "SEND_MESSAGE"),
        (50, "SEND_MESSAGE"),
        (51, "OTP_VERIFICATION"),
        (70, "OTP_VERIFICATION"),
        (71, "CALL_VERIFICATION"),
        (90, "CALL_VERIFICATION"),
        (91, "TEMPORARY_BLOCK"),
        (100, "TEMPORARY_BLOCK"),
    ])
    def test_exact_risk_boundaries(self, score: int, expected_tier: str):
        """Verifies that each specified score boundary maps to its exact expected tier."""
        tier, action, msg, delivery = get_risk_action_tier(score)
        assert tier == expected_tier, f"Score {score} expected {expected_tier}, but got {tier}"

    @pytest.mark.parametrize("invalid_score", [-1, -50, 101, 150])
    def test_out_of_bounds_scores_rejected(self, invalid_score: int):
        """Verifies that scores outside [0, 100] raise a ValueError."""
        with pytest.raises(ValueError):
            get_risk_action_tier(invalid_score)

    def test_criteria_weights_sum_to_100(self):
        """Ensures that configured maximum criteria points sum exactly to 100."""
        total_weights = sum(DEFAULT_WEIGHTS.values())
        assert total_weights == 100, f"Criteria weights sum to {total_weights}, expected 100"

    def test_criteria_weights_non_overlapping(self):
        """Ensures the 8 defined criteria are all distinct."""
        expected_criteria = {
            "unusual_amount",
            "unfamiliar_device",
            "unusual_location",
            "repeated_failed_logins",
            "high_frequency",
            "unusual_time",
            "new_beneficiary",
            "behavioural_anomaly",
        }
        assert set(DEFAULT_WEIGHTS.keys()) == expected_criteria

    def test_test_mode_evaluation_labels(self):
        """Ensures test score evaluation returns proper breakdown and label."""
        tier, action, msg, delivery, breakdown = scoring_engine.evaluate_test_score(75)
        assert tier == "CALL_VERIFICATION"
        assert len(breakdown) == 1
        assert "TEST DATA" in breakdown[0].explanation
