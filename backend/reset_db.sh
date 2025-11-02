#!/bin/bash
# This script resets the local database to a clean state with all migrations and seed data applied.

set -e

echo "--- Resetting database to initial state with seed data ---"

alembic downgrade base
alembic upgrade head

echo "--- Database reset complete ---"
