from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert

from .config import Settings
from .models import Opportunity

CATALOG = [
    {
        "id": "1",
        "title": "Climate Resilience Infrastructure",
        "funder": "Grantum local fixture",
        "deadline": "Local test opportunity",
        "amount": "Not published",
        "region": "Global",
        "category": "Infrastructure",
        "summary": "Prepare an infrastructure proposal for the local Grantum rehearsal.",
        "requirements": ["Mission", "Pain", "Solution", "Market", "Competitors", "Moat"],
    },
    {
        "id": "2",
        "title": "Community Water Access",
        "funder": "Grantum local fixture",
        "deadline": "Local test opportunity",
        "amount": "Not published",
        "region": "Central Asia",
        "category": "Community",
        "summary": "Prepare a project profile and application for a simulated water access program.",
        "requirements": ["Mission", "Approach", "Outcomes"],
    },
]


def seed(settings):
    if not settings.local:
        raise RuntimeError("Demo catalog records are restricted to local mode.")
    with create_engine(settings.database_url).begin() as conn:
        conn.execute(
            insert(Opportunity)
            .values(CATALOG)
            .on_conflict_do_nothing(index_elements=[Opportunity.id])
        )


if __name__ == "__main__":
    seed(Settings.from_env())
    print("Grantum local catalog ready.")
