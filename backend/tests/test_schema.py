import pytest
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
import os

def test_migrations_are_in_sync(db_engine):
    """
    Verifies that the database schema is up-to-date with the models
    and that there are no pending migrations or model changes missing migrations.
    
    This replaces 'alembic check' in the CI pipeline.
    """
    # 1. Verify we are effectively on HEAD (already done by db_engine fixture)
    
    # 2. Check for missing migrations (changes in models not yet generated)
    # We can use alembic's autogenerate diff to see if anything is missing
    
    alembic_ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    
    # Connect to the test database
    with db_engine.connect() as connection:
        alembic_cfg.attributes['connection'] = connection
        
        # Check if there are any differences between the models and the DB
        # This is roughly equivalent to running 'alembic check'
        # verify_migration logic can be complex to duplicate perfectly via API,
        # but running 'alembic check' via command line inside the test environment 
        # is the most robust way if we want exact behavior.
        # However, calling command.check(alembic_cfg) is the API equivalent.
        
        try:
            command.check(alembic_cfg)
        except Exception as e:
            pytest.fail(f"Alembic check failed: {e}. This means your models are not in sync with your migrations.")
