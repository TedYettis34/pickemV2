#!/bin/bash

# Database Migration Script for PickEm RDS Instance
# Run this after setting up SSH tunnel to bastion host

# Database connection info (via SSH tunnel)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pickem"
DB_USER="postgres"

# Get password from user (retrieved from AWS Secrets Manager)
echo "Enter the database password from AWS Secrets Manager:"
read -s DB_PASSWORD

echo "Running database migrations..."

# Array of migration files in correct order
MIGRATIONS=(
    "database/schema/001_create_weeks_table.sql"
    "database/schema/002_create_users_table.sql"
    "database/schema/003_create_games_table.sql"
    "database/schema/004_add_week_locked_status.sql"
    "database/schema/005_remove_week_locked_status.sql"
    "database/schema/006_create_picks_table.sql"
    "database/schema/007_add_must_pick_to_games.sql"
    "database/schema/008_add_max_picker_choice_games_to_weeks.sql"
    "database/schema/009_add_max_triple_plays_to_weeks.sql"
    "database/schema/010_add_is_triple_play_to_picks.sql"
    "database/schema/011_add_game_results.sql"
    "database/schema/012_add_pick_results.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    echo "Running migration: $migration"
    
    if [ -f "$migration" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully ran: $migration"
        else
            echo "❌ Failed to run: $migration"
            echo "Migration stopped due to error."
            exit 1
        fi
    else
        echo "❌ Migration file not found: $migration"
        exit 1
    fi
    
    echo ""
done

# Run sample data (optional)
echo "Running sample data..."
SAMPLE_DATA="database/seeds/weeks_sample_data.sql"

if [ -f "$SAMPLE_DATA" ]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SAMPLE_DATA"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully loaded sample data: $SAMPLE_DATA"
    else
        echo "❌ Failed to load sample data: $SAMPLE_DATA"
    fi
else
    echo "❌ Sample data file not found: $SAMPLE_DATA"
fi

echo ""
echo "🎉 Database migrations completed successfully!"
echo ""
echo "Verifying tables were created..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"