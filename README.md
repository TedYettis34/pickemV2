# PickEm V2

A modern pick'em/prediction web application built with Next.js, TypeScript, and AWS cloud services.

## Features

- 🏈 **Weekly Pick'em Games**: Create and manage weekly prediction contests
- 👥 **User Management**: Secure authentication and user profiles
- 📊 **Real-time Scoring**: Track picks and calculate scores
- ☁️ **Cloud-Native**: Built on AWS with cost-optimized infrastructure
- 🚀 **Serverless**: Deployed on Vercel with connection pooling

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with PgBouncer connection pooling
- **Cloud**: AWS (RDS, Secrets Manager, NAT Instance)
- **Deployment**: Vercel
- **Infrastructure**: Terraform

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (for local development)
- AWS credentials configured

### Local Development

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd pickemV2
npm install
```

2. **Set up local database**:
```bash
# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create database and run migrations
createdb pickem
psql -d pickem -f database/schema/001_create_weeks_table.sql
psql -d pickem -f database/schema/002_create_users_table.sql
psql -d pickem -f database/schema/003_create_games_table.sql
psql -d pickem -f database/schema/004_add_week_locked_status.sql
```

3. **Configure environment**:
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your local database settings
```

4. **Start development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Production Architecture

The production environment uses a cost-optimized AWS setup:

### Database Layer
- **RDS PostgreSQL**: Private database instance (db.t4g.micro)
- **PgBouncer**: Connection pooling running on NAT instance
- **Connection**: Vercel serverless functions → PgBouncer (52.5.36.87:6432) → RDS PostgreSQL

### Infrastructure
- **Terraform**: Infrastructure as Code for AWS resources
- **NAT Instance**: Cost-effective alternative to NAT Gateway ($4.70/month vs $57.15/month)
- **Security**: Database in private subnets, accessed via VPC infrastructure
- **Secrets**: Database credentials managed via AWS Secrets Manager

### Cost Optimization
- **Connection Pooling**: $0 additional cost (PgBouncer on existing NAT instance)
- **Database**: Cost-optimized RDS instance
- **Network**: NAT Instance saves ~$630/year vs NAT Gateway

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Management

Database migrations are located in `database/schema/` and can be run using:
- Local: Direct PostgreSQL connection
- Production: Via deployed Vercel API endpoints with proper authentication

## Environment Variables

- **Local**: Use `.env.local` for local database configuration
- **Production**: AWS Secrets Manager via `DB_CREDENTIALS_SECRET_ARN`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

For detailed development guidelines, see `CLAUDE.md`.
