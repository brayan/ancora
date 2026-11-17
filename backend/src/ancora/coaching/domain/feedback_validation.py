import re

from ancora.coaching.domain.models import CoachingFeedback, CoachingInvalid


def validate_feedback(feedback: CoachingFeedback) -> None:
    texts = (feedback.summary, *feedback.observations, feedback.next_step)
    if not 1 <= len(feedback.observations) <= 4:
        raise CoachingInvalid
    for text in texts:
        units = len(text.encode("utf-16-le", errors="surrogatepass")) // 2
        is_invalid_feedback_text = (
            not text.strip()
            or units > 900
            or "```" in text
            or re.search(r"\b(?:async\s+)?def\s+\w+\s*\(", text) is not None
        )
        if is_invalid_feedback_text:
            raise CoachingInvalid
