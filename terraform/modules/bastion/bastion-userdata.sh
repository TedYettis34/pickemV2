#!/bin/bash
# Bastion Host User Data Script
# Sets up the bastion host with necessary tools for database access

set -e

# Update system
yum update -y

# Install PostgreSQL client and other useful tools
yum install -y postgresql15 postgresql15-contrib aws-cli jq telnet nc

# Install Node.js (for running migration scripts if needed)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Create a script to get database credentials
cat > /home/ec2-user/get-db-credentials.sh << 'EOF'
#!/bin/bash
# Script to retrieve database credentials from Secrets Manager

SECRET_ARN="${db_credentials_secret_arn}"
AWS_REGION="${aws_region}"

echo "Retrieving database credentials from Secrets Manager..."
aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text | jq -r '
    "Database Connection Details:",
    "Host: " + (.host | split(":")[0]),
    "Port: " + (.port | tostring),
    "Database: " + .dbname,
    "Username: " + .username,
    "Password: " + .password,
    "",
    "Connection string:",
    "psql -h " + (.host | split(":")[0]) + " -p " + (.port | tostring) + " -U " + .username + " -d " + .dbname
    '
EOF

chmod +x /home/ec2-user/get-db-credentials.sh
chown ec2-user:ec2-user /home/ec2-user/get-db-credentials.sh

# Create a script to connect to the database
cat > /home/ec2-user/connect-db.sh << 'EOF'
#!/bin/bash
# Script to connect to the database using credentials from Secrets Manager

SECRET_ARN="${db_credentials_secret_arn}"
AWS_REGION="${aws_region}"

echo "Connecting to database..."
CREDS=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text)

DB_HOST=$(echo "$CREDS" | jq -r '.host' | cut -d: -f1)
DB_PORT=$(echo "$CREDS" | jq -r '.port')
DB_NAME=$(echo "$CREDS" | jq -r '.dbname')
DB_USER=$(echo "$CREDS" | jq -r '.username')
DB_PASS=$(echo "$CREDS" | jq -r '.password')

export PGPASSWORD="$DB_PASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
EOF

chmod +x /home/ec2-user/connect-db.sh
chown ec2-user:ec2-user /home/ec2-user/connect-db.sh

# Create a welcome message
cat > /etc/motd << 'EOF'
================================================================================
                          PickEm Bastion Host
================================================================================

This bastion host provides secure access to your PickEm database.

Available scripts:
  ./get-db-credentials.sh  - Display database connection details
  ./connect-db.sh          - Connect directly to the database

For SSH tunnel from your local machine:
  ssh -i ~/.ssh/your-key.pem -L 5432:db-endpoint:5432 ec2-user@bastion-ip
  
Then connect locally:
  psql -h localhost -p 5432 -U pickemadmin -d pickem

================================================================================
EOF

# Set proper permissions
chown ec2-user:ec2-user /home/ec2-user/*

# Log completion
echo "$(date): Bastion host setup completed" >> /var/log/user-data.log