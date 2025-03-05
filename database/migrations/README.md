# Database Migrations

This directory contains SQL migration files for the Pokemon Fusion database. Each file is prefixed with a date in the format YYYYMMDD to indicate when it was created or applied.

## Migration Files

- **20240305_add_clerk_id_to_users.sql**: Adds a clerk_id column to the users table for Clerk authentication integration.
- **20240305_add_pokemon_names_to_fusions.sql**: Adds pokemon name columns to the fusions table for improved search and display.
- **20240305_create-users-table-procedure.sql**: Contains procedures for creating and managing the users table.
- **20240305_fix_likes_count.sql**: Fixes the discrepancy between likes count in fusions table and entries in favorites table. Adds triggers to keep them in sync.
- **20240305_supabase_functions.sql**: Contains various Supabase RPC functions used by the application.
- **20240305_supabase_migration.sql**: Contains database schema migrations for Supabase.
- **20240305_supabase_schema_fix.sql**: Contains fixes for the database schema.

## How to Apply Migrations

These migrations have already been applied to the production database. They are kept here for documentation and to allow recreation of the database structure if needed.

To apply a migration:

1. Log in to the Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of the migration file
4. Execute the SQL commands

## Notes

- Always back up the database before applying migrations
- Test migrations in a development environment before applying to production
- Add new migrations with a date prefix in the format YYYYMMDD 