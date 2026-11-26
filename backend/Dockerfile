FROM ghcr.io/astral-sh/uv:0.13.7 AS uv
FROM python:3.13-slim
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /grantum
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-cache --no-managed-python
COPY grantum_api grantum_api
COPY migrations migrations
COPY alembic.ini .
ENV PATH="/grantum/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER 65532:65532
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "grantum_api:create_app()"]
