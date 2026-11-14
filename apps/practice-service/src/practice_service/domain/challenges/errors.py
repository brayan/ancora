class DraftInvalid(Exception):
    def __init__(
        self,
        issue: str = "structure_invalid",
    ) -> None:
        self.issue = issue
        super().__init__(issue)
