#!/bin/bash

# Production Migration Script: Add cutoff_time to weeks table
# Make sure SSH tunnel is running first:
# ssh -i ~/.ssh/pickem-bastion-key.pem -L 5432:pickem-dev-cost-optimized-db.ck92c4ks40r0.us-east-1.rds.amazonaws.com:5432 ec2-user@44.216.237.95

set -e  # Exit on any error

echo "🚀 Running cutoff_time migration against production database..."
echo "============================================================"

# Database connection details (via SSH tunnel)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pickem"

# Try to determine the correct DB user
echo "🔍 Detecting database user..."
if [ -z "$DB_USER" ]; then
    echo "Please enter the database username (commonly 'postgres', 'admin', or 'root'):"
    read -p "Database user: " DB_USER
fi

# Check if SSH tunnel is active
if ! nc -z localhost 5432 2>/dev/null; then
    echo "❌ SSH tunnel not detected on localhost:5432"
    echo "Please start the SSH tunnel first:"
    echo "ssh -i ~/.ssh/pickem-bastion-key.pem -L 5432:pickem-dev-cost-optimized-db.ck92c4ks40r0.us-east-1.rds.amazonaws.com:5432 ec2-user@44.216.237.95"
    exit 1
fi

echo "✅ SSH tunnel detected on localhost:5432"

# Show what we're about to run
echo ""
echo "📝 Migration content:"
echo "--------------------"
cat database/schema/005_add_cutoff_time_to_weeks.sql
echo ""

# Confirm before proceeding
read -p "🤔 Are you sure you want to run this migration against PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 1
fi

echo ""
echo "🔧 Executing migration..."

# Run the migration
if command -v psql >/dev/null 2>&1; then
    # Using psql if available
    echo "Using psql to execute migration..."
    psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f database/schema/005_add_cutoff_time_to_weeks.sql
else
    echo "❌ psql not found. Please install PostgreSQL client or run the migration manually."
    echo ""
    echo "Manual steps:"
    echo "1. Connect to localhost:5432 with your database client"
    echo "2. Run the contents of database/schema/005_add_cutoff_time_to_weeks.sql"
    exit 1
fi

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "🔍 Verifying the new column exists..."

# Verify the migration worked
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'weeks' AND column_name = 'cutoff_time';"

echo ""
echo "🎉 Migration deployment complete!"
echo "The cutoff_time column has been added to the weeks table."
