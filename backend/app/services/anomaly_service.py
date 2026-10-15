import math
from typing import Dict, Any, Tuple


class CustomerBaseline:
    """Represents a customer's standard spending and behavior baseline."""

    def __init__(self, avg_amount: float, std_amount: float, avg_hourly_tx: float):
        self.avg_amount = avg_amount
        self.std_amount = max(std_amount, 10.0)  # Avoid division by zero
        self.avg_hourly_tx = avg_hourly_tx


# Predefined fictional baselines for demo customers
CUSTOMER_BASELINES: Dict[str, CustomerBaseline] = {
    "CUST-1001": CustomerBaseline(avg_amount=45.0, std_amount=20.0, avg_hourly_tx=1.0),
    "CUST-1002": CustomerBaseline(avg_amount=120.0, std_amount=40.0, avg_hourly_tx=1.2),
    "CUST-1003": CustomerBaseline(avg_amount=250.0, std_amount=75.0, avg_hourly_tx=1.5),
    "CUST-1004": CustomerBaseline(avg_amount=80.0, std_amount=25.0, avg_hourly_tx=1.0),
    "CUST-1005": CustomerBaseline(avg_amount=600.0, std_amount=150.0, avg_hourly_tx=2.0),
}

DEFAULT_BASELINE = CustomerBaseline(avg_amount=75.0, std_amount=30.0, avg_hourly_tx=1.0)


def evaluate_anomaly(customer_id: str, amount: float, hourly_count: int) -> Tuple[bool, float, str]:
    """
    Evaluates behavioral anomaly using z-score relative to the customer's historical baseline.
    Returns (is_anomaly, z_score, explanation).
    Criterion weight: 10 points.
    """
    baseline = CUSTOMER_BASELINES.get(customer_id, DEFAULT_BASELINE)

    # Calculate z-score on amount
    z_score = (amount - baseline.avg_amount) / baseline.std_amount

    # Velocity deviation factor
    velocity_factor = hourly_count / max(baseline.avg_hourly_tx, 1.0)

    # Anomaly triggers if z_score >= 2.5 or velocity combined z_score is high
    if z_score >= 2.5:
        explanation = (
            f"Statistically significant deviation (z-score: {z_score:.2f} >= 2.50) from customer baseline "
            f"(mean: ${baseline.avg_amount:.2f}, std: ${baseline.std_amount:.2f})"
        )
        return True, round(z_score, 2), explanation
    elif z_score >= 1.8 and velocity_factor >= 3.0:
        explanation = (
            f"Compound anomaly: elevated amount (z-score: {z_score:.2f}) combined with "
            f"{hourly_count}x hourly velocity surge"
        )
        return True, round(z_score, 2), explanation

    return False, round(z_score, 2), f"Within expected baseline limits (z-score: {z_score:.2f})"
