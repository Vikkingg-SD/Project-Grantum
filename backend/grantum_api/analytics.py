"""Send consented product events outside web requests."""

from datetime import UTC, datetime, timedelta

import requests
from flask import current_app, g
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .config import Settings
from .models import Account, AnalyticsEvent


def record(actor, event):
    if current_app.config["POSTHOG_ENABLED"] and actor.analytics_opt_in:
        g.db.add(AnalyticsEvent(account_id=actor.id, event=event))


def discard_pending(db, account_id):
    db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.account_id == account_id))


def deliver(settings, *, send=requests.post):
    if not settings.posthog_key:
        return 0
    db = create_engine(
        settings.database_url, pool_pre_ping=True, connect_args={"connect_timeout": 5}
    )
    delivered = 0
    try:
        for _ in range(20):
            with Session(db) as session, session.begin():
                now = datetime.now(UTC)
                session.execute(
                    delete(AnalyticsEvent).where(
                        AnalyticsEvent.created_at < now - timedelta(days=7)
                    )
                )
                row = session.execute(
                    select(AnalyticsEvent, Account.analytics_opt_in)
                    .join(Account, Account.id == AnalyticsEvent.account_id)
                    .where(AnalyticsEvent.next_at <= now)
                    .order_by(AnalyticsEvent.created_at)
                    .limit(1)
                    .with_for_update(of=AnalyticsEvent, skip_locked=True)
                ).one_or_none()
                if not row:
                    break
                event, allowed = row
                if not allowed:
                    session.delete(event)
                    continue
                try:
                    reply = send(
                        settings.posthog_origin + "/i/v0/e/",
                        json={
                            "api_key": settings.posthog_key,
                            "event": event.event,
                            "uuid": event.id,
                            "distinct_id": event.account_id,
                            "timestamp": event.created_at.isoformat(),
                            "properties": {
                                "$process_person_profile": False,
                                "$geoip_disable": True,
                            },
                        },
                        timeout=(2, 4),
                        allow_redirects=False,
                    )
                    success = 200 <= reply.status_code < 300
                except requests.RequestException:
                    success = False
                if success:
                    session.delete(event)
                    delivered += 1
                else:
                    event.failures += 1
                    event.next_at = now + timedelta(minutes=min(2 ** min(event.failures, 8), 240))
                    break
    finally:
        db.dispose()
    return delivered


if __name__ == "__main__":
    print("PostHog events delivered:", deliver(Settings.from_env()))
