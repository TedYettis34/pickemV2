# PickEm V2

A modern pick'em/prediction web application built with Next.js, TypeScript, and AWS cloud services.

## Features

- 🏈 **Weekly Pick'em Games**: Create and manage weekly prediction contests with spreads and over/under bets
- 👥 **User Management**: Secure AWS Cognito authentication with JWT tokens
- 📊 **Real-time Scoring**: Automated score fetching and pick evaluation with manual override capabilities
- 🔐 **Admin Dashboard**: Comprehensive admin panel for game management, scoring, and user administration
- ⚡ **Automated Updates**: Scheduled score fetching with intelligent caching and rate limiting
- 🛡️ **Secure API**: JWT-based authentication with admin role-based access control
- ☁️ **Cloud-Native**: Built on AWS with cost-optimized infrastructure
- 🚀 **Serverless**: Deployed on Vercel with connection pooling

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, React hooks
- **Authentication**: AWS Cognito with JWT tokens
- **Database**: PostgreSQL with PgBouncer connection pooling
- **Cloud**: AWS (RDS, Cognito, Secrets Manager, NAT Instance)
- **Deployment**: Vercel
- **Infrastructure**: Terraform
- **Testing**: Jest, React Testing Library

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

The production environment uses a cost-optimized AWS setup with comprehensive authentication and data management:

### Authentication Layer
- **AWS Cognito**: User pool for secure authentication and authorization
- **JWT Tokens**: Stateless authentication with admin group-based access control
- **Token Refresh**: Automatic token refresh handling in client-side hooks
- **Admin Roles**: Role-based access control with Cognito user groups

### Database Layer
- **RDS PostgreSQL**: Private database instance (db.t4g.micro) with automated backups
- **PgBouncer**: Connection pooling running on NAT instance for efficient connection management
- **Connection Flow**: Vercel serverless functions → PgBouncer (52.5.36.87:6432) → RDS PostgreSQL
- **Schema Management**: Version-controlled database migrations with rollback capabilities

### API Layer
- **Next.js API Routes**: Serverless API endpoints with JWT authentication middleware
- **Admin APIs**: Protected admin endpoints for game management and scoring
- **Score Automation**: Automated score fetching with intelligent retry logic and caching
- **Rate Limiting**: Built-in rate limiting for admin checks and API calls

### Infrastructure
- **Terraform**: Infrastructure as Code for all AWS resources
- **NAT Instance**: Cost-effective alternative to NAT Gateway ($4.70/month vs $57.15/month)
- **VPC Security**: Database in private subnets with security group restrictions
- **Secrets Management**: Database and AWS credentials via AWS Secrets Manager
- **Multi-AZ**: High availability setup across multiple availability zones

### Cost Optimization
- **Connection Pooling**: $0 additional cost (PgBouncer on existing NAT instance)
- **Database**: Right-sized RDS instance with cost monitoring
- **Network**: NAT Instance saves ~$630/year vs NAT Gateway
- **Serverless**: Pay-per-use Vercel deployment model
- **Cognito**: Cost-effective authentication (50,000 MAU free tier)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## Key Features

### Admin Dashboard
- **Game Management**: Create, edit, and manage weekly games with spreads
- **Score Updates**: Manual and automated score fetching from external APIs
- **Pick Evaluation**: Automatic evaluation of user picks against final scores
- **Emergency Tools**: Force finalization and diagnostic tools for troubleshooting
- **User Management**: View and manage user accounts and admin privileges

### Authentication System
- **AWS Cognito Integration**: Secure user registration and login
- **JWT Token Management**: Automatic token refresh and validation
- **Admin Authorization**: Role-based access control with admin group membership
- **Session Management**: Secure session handling with automatic cleanup

### Scoring System
- **Automated Updates**: Scheduled score fetching with intelligent retry logic
- **Pick Evaluation**: Support for spread bets, over/under, and straight picks
- **Manual Override**: Admin ability to manually update scores and force finalization
- **Caching**: Intelligent caching to reduce API calls and improve performance

## Database Management

Database migrations are located in `database/schema/` and can be run using:
- **Local**: Direct PostgreSQL connection with psql commands
- **Production**: Via deployed Vercel API endpoints with admin authentication
- **Schema**: Versioned migrations with proper foreign key relationships

## Environment Variables

### Local Development
Create a `.env.local` file with:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/pickem

# AWS (for local testing)
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
```

### Production
- **Database**: AWS Secrets Manager via `DB_CREDENTIALS_SECRET_ARN`
- **Authentication**: Vercel environment variables for Cognito configuration
- **AWS Services**: IAM roles and policies for secure service access

## API Endpoints

### Public Routes
- `GET /api/weeks` - Get available weeks
- `GET /api/weeks/[id]/games` - Get games for a specific week
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh

### Protected Routes (JWT Required)
- `GET /api/user/picks` - Get user's picks
- `POST /api/picks` - Submit picks
- `GET /api/auth/admin` - Check admin status

### Admin Routes (Admin JWT Required)
- `GET /api/admin/weeks` - Manage weeks
- `POST /api/admin/games` - Create/update games
- `POST /api/admin/scores/update` - Update scores
- `POST /api/admin/scores/diagnose` - Diagnostic information
- `POST /api/admin/games/[id]/finalize` - Force game finalization

## Testing

The project includes comprehensive test coverage:
- **Unit Tests**: Core business logic and utility functions
- **Component Tests**: React component rendering and behavior
- **API Tests**: Authentication and admin route functionality
- **Hook Tests**: Custom React hooks with proper mocking

Run tests with:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b PIC-XX`)
3. Make your changes
4. Run tests and ensure they pass (`npm test`)
5. Run linting (`npm run lint`)
6. Submit a pull request

For detailed development guidelines, see `CLAUDE.md`.

## Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### AWS Infrastructure
1. Configure AWS credentials and region
2. Apply Terraform configuration for AWS resources
3. Update security groups and network access as needed

## Troubleshooting

### Common Issues
- **Database Connection**: Check security group settings and NAT instance status
- **Authentication**: Verify Cognito configuration and JWT token format
- **Admin Access**: Ensure user is in admin group in Cognito User Pool
- **Score Updates**: Use admin diagnostic tools to debug scoring issues

### Debug Tools
- Admin dashboard includes diagnostic buttons for troubleshooting
- Detailed logging in API routes for debugging authentication
- Rate limiting status visible in admin UI
