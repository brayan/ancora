import re

from ancora.domain.hints.models import Hint, HintInvalid


def validate_hint(
    hint: Hint,
    requested_level: int,
) -> None:
    text = hint.content
    units = len(text.encode("utf-16-le", errors="surrogatepass")) // 2
    is_invalid_hint = (
        type(hint.level) is not int
        or hint.level != requested_level
        or not 1 <= hint.level <= 3
        or not text.strip()
        or units > 1800
        or "```" in text
        or re.search(r"\b(?:async\s+)?def\s+\w+\s*\(", text) is not None
    )
    if is_invalid_hint:
        raise HintInvalid
