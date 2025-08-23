# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pickemV2 is a pick'em/prediction web application built with Next.js and TypeScript. The project includes AWS integration for cloud services and Linear integration for project management.

## Current State

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, App Router
- **Cloud Services**: AWS SDK integrated (S3, DynamoDB, Lambda)
- **Infrastructure**: Terraform configuration (in setup phase)
- **Project Management**: Linear MCP server configured
- **License**: MIT License

## Development Setup

### Prerequisites

- Node.js and npm
- PostgreSQL (for local development)
- AWS credentials configured
- Linear API key (for MCP integration)

### Database Setup (Local Development)

1. Install and start PostgreSQL:
```bash
brew install postgresql@14
brew services start postgresql@14
```

2. Create database and run schema:
```bash
createdb pickem
psql -d pickem -f database/schema/001_create_weeks_table.sql
psql -d pickem -f database/schema/002_create_users_table.sql
psql -d pickem -f database/schema/003_create_games_table.sql
psql -d pickem -f database/schema/004_add_week_locked_status.sql
psql -d pickem -f database/seeds/weeks_sample_data.sql
```

3. Configure `.env.local` for local database (comment out `DB_CREDENTIALS_SECRET_ARN`):
```bash
# Local database configuration
DB_NAME=pickem
DB_PORT=5432
DB_USER=
DB_PASSWORD=
```

### Getting Started

```bash
npm install
npm run dev
```

### Environment Variables

Set up your environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_aws_access_key
export AWS_SECRET_ACCESS_KEY=your_aws_secret_key
export AWS_REGION=your_preferred_region
```

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Database**: PostgreSQL (local development) / AWS RDS PostgreSQL (production)
- **Connection Pooling**: PgBouncer running on NAT instance (52.5.36.87:6432)
- **Cloud**: AWS services (S3, DynamoDB, Lambda, Secrets Manager)
- **Infrastructure**: Terraform for AWS resource management
- **Project Management**: Linear integration via MCP server

## Production Database Architecture

The production environment uses a cost-optimized setup:
- **RDS PostgreSQL**: Private database instance (db.t4g.micro)
- **PgBouncer**: Connection pooling on existing NAT instance
- **Vercel Integration**: Serverless functions connect via PgBouncer (52.5.36.87:6432)
- **Cost**: $0 additional cost for connection pooling vs $12-16/month for RDS Proxy
- **Security**: Database remains private, connections routed through VPC infrastructure

## Production Database Connection (PgBouncer)

PgBouncer is installed and configured on the NAT instance (52.5.36.87) to provide connection pooling for Vercel serverless functions:

### PgBouncer Management
```bash
# SSH to NAT instance
ssh -i ~/.ssh/pickem-bastion-key.pem ec2-user@52.5.36.87

# Check PgBouncer status
sudo systemctl status pgbouncer

# View logs
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# Restart service
sudo systemctl restart pgbouncer
```

### Configuration Files
- **Main config**: `/etc/pgbouncer/pgbouncer.ini`
- **User credentials**: `/etc/pgbouncer/users.txt` 
- **Service file**: `/etc/systemd/system/pgbouncer.service`

### Connection Details
- **External endpoint**: 52.5.36.87:6432
- **Pool mode**: Transaction (optimal for serverless)
- **Max connections**: 100 client, 20 database, 10 default pool
- **Target database**: RDS PostgreSQL (private)

## MCP Configuration

Linear MCP server is configured in `mcp-config.json` for project management integration.
