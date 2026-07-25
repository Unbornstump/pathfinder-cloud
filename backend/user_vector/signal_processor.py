"""Turn SignalLog behavior into ambition_vector continuously."""

from __future__ import annotations

from collections import defaultdict

from core.models import SignalAction, SignalLog


WEIGHTS = {
    SignalAction.APPLY: 3.0,
    SignalAction.BOOKMARK: 2.0,
    SignalAction.LINGER: 0.5,
    SignalAction.DISMISS: -1.5,
}


def recompute_ambition_vector(profile) -> dict:
    scores: dict[str, float] = defaultdict(float)
    logs = (
        SignalLog.objects.filter(profile=profile, opportunity__isnull=False)
        .select_related("opportunity")
        .order_by("-timestamp")[:200]
    )
    for log in logs:
        cat = getattr(log.opportunity, "category", None)
        if not cat:
            continue
        scores[cat] += WEIGHTS.get(log.action, 0.0)

    # Also mild boost from explicit desired_types / interest engagement
    for t in profile.desired_types or []:
        scores[str(t)] += 0.5

    # Normalize to 0..1 confidence
    max_abs = max((abs(v) for v in scores.values()), default=1.0) or 1.0
    confidence = {k: round(max(0.0, v) / max_abs, 3) for k, v in scores.items() if v > 0}
    inferred = sorted(confidence.keys(), key=lambda k: confidence[k], reverse=True)

    vector = {
        "inferred_categories": inferred,
        "confidence_scores": confidence,
    }
    profile.ambition_vector = vector
    profile.save(update_fields=["ambition_vector"])
    return vector


def record_signal(profile, opportunity, action: str):
    from core.models import SignalLog

    SignalLog.objects.create(
        profile=profile,
        opportunity=opportunity,
        action=action,
    )
    return recompute_ambition_vector(profile)
