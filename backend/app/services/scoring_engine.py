import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple
from backend.app.schemas.event import CriterionBreakdown
from backend.app.services.anomaly_service import evaluate_anomaly, CUSTOMER_BASELINES, DEFAULT_BASELINE

# Default criteria weights configuration
DEFAULT_WEIGHTS = {
    "unusual_amount": 20,
    "unfamiliar_device": 15,
    "unusual_location": 15,
    "repeated_failed_logins": 15,
    "high_frequency": 10,
    "unusual_time": 5,
    "new_beneficiary": 10,
    "behavioural_anomaly": 10,
}

# Boundary mapping ranges
def get_risk_action_tier(score: int) -> Tuple[str, str, str, str]:
    """
    Maps an integer score [0, 100] to its exact risk tier and recommended action.
    Returns: (risk_level, recommended_action, action_message, delivery_status)
    Boundaries:
      0-30:   NORMAL
      31-50:  SEND_MESSAGE
      51-70:  OTP_VERIFICATION
      71-90:  CALL_VERIFICATION
      91-100: TEMPORARY_BLOCK
    """
    if score < 0 or score > 100:
        raise ValueError(f"Score {score} is out of bounds [0, 100]")

    if score <= 30:
        return (
            "NORMAL",
            "Approve Transaction",
            None,
            "No message needed"
        )
    elif score <= 50:
        return (
            "SEND_MESSAGE",
            "Send Security Advisory Notification",
            "Security alert: We detected unusual activity on your account. If this was not you, please contact your bank immediately.",
            "Simulated – no real SMS sent"
        )
    elif score <= 70:
        return (
            "OTP_VERIFICATION",
            "Require One-Time Passcode Verification",
            "Elevated risk activity detected. Complete demo one-time passcode verification to confirm authorization.",
            "Simulated OTP – demo verification only"
        )
    elif score <= 90:
        return (
            "CALL_VERIFICATION",
            "Pending Manual Call Verification",
            "High risk indicators present. Transaction routed to security analyst queue for manual telephone verification.",
            "Simulated – no real call placed"
        )
    else:
        return (
            "TEMPORARY_BLOCK",
            "Temporarily Block Account Activity",
            "Critical risk indicators triggered. Account activity has been temporarily restricted pending senior analyst security review.",
            "Simulated block – no real financial accounts affected"
        )


class ScoringEngine:
    """
    Transparent, configurable fraud risk scoring engine.
    Calculates 8 non-overlapping criteria, clamps final score to [0, 100],
    and determines exact risk tiers and action workflows.
    """

    def __init__(self, weights: Dict[str, int] = None):
        self.weights = weights or DEFAULT_WEIGHTS

    def evaluate_event(
        self,
        customer_id: str,
        event_type: str,
        amount: float,
        device_known: bool,
        location_known: bool,
        failed_login_attempts: int,
        hourly_transaction_count: int,
        is_new_beneficiary: bool,
        event_time: datetime = None,
    ) -> Tuple[int, str, str, str, str, List[CriterionBreakdown]]:
        """
        Evaluates the 8 fraud criteria for an incoming event.
        Returns: (total_score, risk_level, recommended_action, action_message, delivery_status, breakdown)
        """
        event_time = event_time or datetime.now(timezone.utc)
        breakdown: List[CriterionBreakdown] = []
        total_points = 0

        # Baseline lookup for customer
        baseline = CUSTOMER_BASELINES.get(customer_id, DEFAULT_BASELINE)

        # 1. Unusual transaction amount (Max: 20 pts)
        w_amt = self.weights.get("unusual_amount", 20)
        amt_triggered = False
        amt_exp = "Normal spending range relative to customer profile."
        if event_type == "PAYMENT":
            if amount >= (baseline.avg_amount * 3.5) or amount >= 1500.0:
                amt_triggered = True
                amt_exp = f"Payment amount of ${amount:.2f} significantly exceeds customer average (${baseline.avg_amount:.2f})."
        if amt_triggered:
            total_points += w_amt
        breakdown.append(CriterionBreakdown(
            criterion="unusual_amount",
            name="Unusual Transaction Amount",
            points=w_amt if amt_triggered else 0,
            max_points=w_amt,
            triggered=amt_triggered,
            explanation=amt_exp,
        ))

        # 2. Unfamiliar device (Max: 15 pts)
        w_dev = self.weights.get("unfamiliar_device", 15)
        dev_triggered = not device_known
        dev_exp = "Unrecognized or previously unseen device signature." if dev_triggered else "Known, authorized customer device."
        if dev_triggered:
            total_points += w_dev
        breakdown.append(CriterionBreakdown(
            criterion="unfamiliar_device",
            name="Unfamiliar Device",
            points=w_dev if dev_triggered else 0,
            max_points=w_dev,
            triggered=dev_triggered,
            explanation=dev_exp,
        ))

        # 3. Unusual location (Max: 15 pts)
        w_loc = self.weights.get("unusual_location", 15)
        loc_triggered = not location_known
        loc_exp = "Geographic coordinates or IP location diverge from habitual usage." if loc_triggered else "Standard primary customer location."
        if loc_triggered:
            total_points += w_loc
        breakdown.append(CriterionBreakdown(
            criterion="unusual_location",
            name="Unusual Location",
            points=w_loc if loc_triggered else 0,
            max_points=w_loc,
            triggered=loc_triggered,
            explanation=loc_exp,
        ))

        # 4. Repeated failed login attempts (Max: 15 pts)
        w_login = self.weights.get("repeated_failed_logins", 15)
        login_triggered = False
        login_pts = 0
        login_exp = "Normal login credentials on first attempt."
        if failed_login_attempts >= 3:
            login_triggered = True
            login_pts = w_login
            login_exp = f"Severe authentication anomaly: {failed_login_attempts} consecutive failed login attempts detected."
        elif failed_login_attempts in (1, 2):
            login_triggered = True
            login_pts = round(w_login * 0.4)
            login_exp = f"Minor authentication anomaly: {failed_login_attempts} recent failed attempt(s)."
        if login_triggered:
            total_points += login_pts
        breakdown.append(CriterionBreakdown(
            criterion="repeated_failed_logins",
            name="Repeated Failed Login Attempts",
            points=login_pts,
            max_points=w_login,
            triggered=login_triggered,
            explanation=login_exp,
        ))

        # 5. Unusually high transaction frequency (Max: 10 pts)
        w_freq = self.weights.get("high_frequency", 10)
        freq_triggered = hourly_transaction_count >= 4
        freq_exp = (
            f"Rapid transaction velocity: {hourly_transaction_count} operations in the past hour."
            if freq_triggered else f"Typical velocity ({hourly_transaction_count} transaction/hr)."
        )
        if freq_triggered:
            total_points += w_freq
        breakdown.append(CriterionBreakdown(
            criterion="high_frequency",
            name="High Transaction Frequency",
            points=w_freq if freq_triggered else 0,
            max_points=w_freq,
            triggered=freq_triggered,
            explanation=freq_exp,
        ))

        # 6. Unusual transaction time (Max: 5 pts)
        w_time = self.weights.get("unusual_time", 5)
        hour = event_time.hour
        time_triggered = (hour in (1, 2, 3, 4))
        time_exp = (
            f"Operation initiated during dormant hours ({hour:02d}:00 UTC)."
            if time_triggered else f"Standard daylight/active operation time ({hour:02d}:00 UTC)."
        )
        if time_triggered:
            total_points += w_time
        breakdown.append(CriterionBreakdown(
            criterion="unusual_time",
            name="Unusual Transaction Time",
            points=w_time if time_triggered else 0,
            max_points=w_time,
            triggered=time_triggered,
            explanation=time_exp,
        ))

        # 7. Newly added beneficiary (Max: 10 pts)
        w_ben = self.weights.get("new_beneficiary", 10)
        ben_triggered = bool(is_new_beneficiary)
        ben_exp = (
            "Payment addressed to a newly created recipient account with no transaction history."
            if ben_triggered else "Payment to verified or established recipient (or non-transfer event)."
        )
        if ben_triggered:
            total_points += w_ben
        breakdown.append(CriterionBreakdown(
            criterion="new_beneficiary",
            name="Newly Added Beneficiary",
            points=w_ben if ben_triggered else 0,
            max_points=w_ben,
            triggered=ben_triggered,
            explanation=ben_exp,
        ))

        # 8. Behavioural anomaly (Max: 10 pts)
        w_anom = self.weights.get("behavioural_anomaly", 10)
        anom_triggered, z_score, anom_exp = evaluate_anomaly(customer_id, amount, hourly_transaction_count)
        if anom_triggered:
            total_points += w_anom
        breakdown.append(CriterionBreakdown(
            criterion="behavioural_anomaly",
            name="Behavioural Anomaly",
            points=w_anom if anom_triggered else 0,
            max_points=w_anom,
            triggered=anom_triggered,
            explanation=anom_exp,
        ))

        # Clamp total score strictly to 0 - 100
        final_score = max(0, min(100, total_points))

        # Derive action tier
        risk_level, recommended_action, action_message, delivery_status = get_risk_action_tier(final_score)

        return final_score, risk_level, recommended_action, action_message, delivery_status, breakdown

    def evaluate_test_score(self, score: int) -> Tuple[str, str, str, str, List[CriterionBreakdown]]:
        """
        Evaluates a direct test-mode score (0 to 100) and returns the corresponding tier.
        Guaranteed to adhere to exact boundaries.
        """
        if score < 0 or score > 100:
            raise ValueError(f"Score {score} is out of bounds [0, 100]")

        risk_level, recommended_action, action_message, delivery_status = get_risk_action_tier(score)

        # Synthetic breakdown showing test assignment
        breakdown = [
            CriterionBreakdown(
                criterion="test_mode_input",
                name="Direct Test Score Assignment",
                points=score,
                max_points=100,
                triggered=score > 0,
                explanation=f"Manually assigned test score {score}/100. Label: TEST DATA.",
            )
        ]
        return risk_level, recommended_action, action_message, delivery_status, breakdown


scoring_engine = ScoringEngine()
