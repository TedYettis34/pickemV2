# Database Module

This module creates a cost-optimized RDS PostgreSQL database instance with security best practices, automatic backups, and secrets management. Designed for small to medium applications with cost optimization in mind.

## Architecture

- **RDS PostgreSQL**: Single instance with cost-optimized configuration
- **Security**: Dedicated security group with least-privilege access
- **Secrets Management**: Database credentials stored in AWS Secrets Manager
- **Encryption**: Storage encryption using customer-managed KMS key
- **Networking**: Deployed in private subnets with DB subnet group
- **Monitoring**: Basic CloudWatch metrics (Performance Insights disabled for cost)

## Usage

### Basic Usage

```hcl
module "database" {
  source = "./modules/database"

  project_name               = "myapp"
  environment               = "dev"
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_security_group_id  = aws_security_group.lambda_sg.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Database configuration
  db_username              = "appuser"
  db_instance_class        = "db.t4g.micro"
  enable_multi_az          = false
  backup_retention_days    = 7
  enable_deletion_protection = false
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### Production Configuration

```hcl
module "database" {
  source = "./modules/database"

  project_name               = "myapp"
  environment               = "prod"
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_security_group_id  = aws_security_group.lambda_sg.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Production database configuration
  db_username              = "appuser"
  db_instance_class        = "db.r6g.large"
  enable_multi_az          = true
  backup_retention_days    = 30
  enable_deletion_protection = true
  
  common_tags = local.prod_tags
}
```

### Cost-Optimized Configuration

```hcl
module "database" {
  source = "./modules/database"

  project_name               = "myapp"
  environment               = "dev"
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_security_group_id  = aws_security_group.lambda_sg.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Ultra cost-optimized for small applications
  db_username              = "appuser"
  db_instance_class        = "db.t4g.nano"  # Smallest instance
  enable_multi_az          = false
  backup_retention_days    = 1             # Minimum backups
  enable_deletion_protection = false
  
  common_tags = local.cost_optimized_tags
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| vpc_id | ID of the VPC | `string` | n/a | yes |
| private_subnet_ids | IDs of the private subnets | `list(string)` | n/a | yes |
| lambda_security_group_id | Security group ID for Lambda functions | `string` | n/a | yes |
| kms_key_arn | ARN of the KMS key for encryption | `string` | n/a | yes |
| db_username | Database master username | `string` | `"pickemadmin"` | no |
| db_instance_class | RDS instance class | `string` | `"db.t4g.micro"` | no |
| enable_multi_az | Enable Multi-AZ deployment | `bool` | `false` | no |
| backup_retention_days | Number of days to retain backups | `number` | `7` | no |
| enable_deletion_protection | Enable deletion protection | `bool` | `false` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| database_endpoint | RDS PostgreSQL endpoint |
| database_name | Database name |
| database_port | Database port |
| database_credentials_secret_arn | ARN of the database credentials secret |
| database_security_group_id | ID of the database security group |
| database_instance_id | ID of the database instance |
| database_subnet_group_name | Name of the database subnet group |

## Security Features

### Network Security
- **Private Subnets**: Database deployed only in private subnets
- **Security Groups**: Restrictive ingress rules (PostgreSQL port 5432 only)
- **No Public Access**: `publicly_accessible = false`

### Encryption
- **Storage Encryption**: All data encrypted at rest using KMS
- **Transit Encryption**: SSL/TLS enforced for connections
- **Secrets Management**: Credentials stored in AWS Secrets Manager

### Access Control
- **IAM Integration**: Uses IAM roles for service access
- **Parameter Groups**: Custom parameter group with security optimizations
- **Backup Encryption**: Automated backups are encrypted

## Cost Optimization Features

### Instance Sizing
- **t4g.micro**: ~$15-20/month (recommended for <50 users)
- **t4g.nano**: ~$8-12/month (ultra cost-optimized)
- **Graviton2 Processors**: 20% better price-performance than x86

### Storage Optimization
- **GP3 Storage**: Latest generation for better price-performance
- **Auto Scaling**: Storage grows from 20GB to 100GB as needed
- **No Performance Insights**: Disabled to save ~$7/month

### Monitoring Optimization
- **Basic Monitoring**: 5-minute intervals (free)
- **Enhanced Monitoring**: Disabled (saves ~$2/month)
- **Backup Optimization**: Configurable retention period

## Performance Tuning

The module includes a custom parameter group optimized for small instances:

```hcl
# Key optimizations for 1GB RAM instances
max_connections = 20
shared_buffers = {DBInstanceClassMemory/4}
effective_cache_size = {DBInstanceClassMemory*3/4}
work_mem = 4096  # 4MB
maintenance_work_mem = 64000  # 64MB
```

## Backup and Recovery

- **Automated Backups**: Daily backups during maintenance window
- **Point-in-Time Recovery**: Enabled with configurable retention
- **Maintenance Window**: Sundays 04:00-05:00 UTC
- **Backup Window**: Daily 03:00-04:00 UTC

## Examples

### Connecting from Lambda

```python
import boto3
import json
import psycopg2

def lambda_handler(event, context):
    # Get database credentials from Secrets Manager
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(
        SecretId='myapp-dev-db-credentials'
    )
    
    credentials = json.loads(response['SecretString'])
    
    # Connect to database
    conn = psycopg2.connect(
        host=credentials['host'],
        port=credentials['port'],
        database=credentials['dbname'],
        user=credentials['username'],
        password=credentials['password'],
        sslmode='require'
    )
    
    # Your database operations here
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    result = cursor.fetchone()
    
    conn.close()
    
    return {
        'statusCode': 200,
        'body': json.dumps(f'Database version: {result[0]}')
    }
```

### Application Configuration

```bash
# Environment variables for application
DATABASE_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp-dev-db-credentials
DATABASE_REGION=us-east-1
```

## Scaling Guidelines

### When to Upgrade Instance Class

| Users | CPU Usage | Recommended Instance | Monthly Cost |
|-------|-----------|---------------------|--------------|
| 1-50 | <40% | db.t4g.micro | $15-20 |
| 50-200 | 40-70% | db.t4g.small | $30-40 |
| 200-500 | 70-80% | db.t4g.medium | $60-80 |
| 500+ | >80% | db.r6g.large+ | $120+ |

### Performance Monitoring

Monitor these key metrics:
- **CPU Utilization**: Should stay <80%
- **Database Connections**: Should stay <80% of max_connections
- **Free Storage Space**: Should maintain >20% free
- **Read/Write Latency**: Should stay <10ms for small datasets

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check security group rules
   - Verify Lambda is in same VPC
   - Confirm DNS resolution

2. **High CPU Usage**
   - Review slow query logs
   - Consider upgrading instance class
   - Optimize database queries

3. **Storage Full**
   - Enable auto scaling storage
   - Clean up old data
   - Optimize table indexes

### Monitoring Queries

```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Check database size
SELECT pg_size_pretty(pg_database_size('pickem'));

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Dependencies

This module requires:
- **AWS Provider**: >= 5.0
- **Random Provider**: >= 3.1
- **VPC Module**: Must be deployed first
- **KMS Key**: Must exist before deployment
- **Lambda Security Group**: Must exist for database access

## Notes

- Database password is automatically generated and stored in Secrets Manager
- All backups and snapshots are encrypted using the provided KMS key
- Parameter group is optimized for small instances (1-2GB RAM)
- Module supports both development and production configurations
- Auto minor version upgrades are enabled for security patches