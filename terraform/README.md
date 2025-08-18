# Terraform Infrastructure

This directory contains Terraform configuration for the PickEm v2 application infrastructure.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- AWS CLI configured with appropriate credentials
- AWS IAM permissions for Cognito, S3, and other services

## Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your values:**
   ```hcl
   aws_region  = "us-east-1"
   environment = "dev"
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan the deployment:**
   ```bash
   terraform plan
   ```

5. **Apply the configuration:**
   ```bash
   terraform apply
   ```

## Resources Created

### AWS Cognito
- **User Pool**: For user authentication and management
- **User Pool Client**: Web client configuration for the Next.js application
- **User Pool Domain**: Custom domain for hosted UI

## Configuration Files

- `terraform.tf` - Terraform and provider version requirements
- `providers.tf` - AWS provider configuration
- `variables.tf` - Input variable definitions with validation
- `locals.tf` - Local values and common tags
- `main.tf` - Main resource definitions
- `outputs.tf` - Output values for integration
- `terraform.tfvars.example` - Example variable values

## Outputs

After successful deployment, you'll receive:
- `user_pool_id` - Cognito User Pool ID
- `user_pool_client_id` - Cognito User Pool Client ID
- `user_pool_endpoint` - User Pool endpoint URL
- `user_pool_domain` - Custom domain name
- `user_pool_hosted_ui_url` - Hosted UI URL

## Environment Variables

Set these environment variables or use AWS CLI configuration:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=your_region
```

## Remote State (Recommended)

For production use, configure remote state storage:

1. Create an S3 bucket for state storage
2. Add backend configuration to `terraform.tf`:
   ```hcl
   backend "s3" {
     bucket = "your-terraform-state-bucket"
     key    = "pickem/terraform.tfstate"
     region = "us-east-1"
   }
   ```

## Security

- State files may contain sensitive information
- Use remote state with encryption enabled
- Never commit `terraform.tfvars` to version control
- Use IAM roles with least privilege principle

## Database Connection Guide

### Connecting to RDS through Bastion Host

#### Prerequisites
- AWS credentials configured
- Private key file: `~/.ssh/pickem-bastion-key.pem`
- DBeaver or PostgreSQL client

#### Connection Steps

1. **Start SSH Tunnel**
   ```bash
   ssh -i ~/.ssh/pickem-bastion-key.pem -L 5433:pickem-dev-cost-optimized-db.ck92c4ks40r0.us-east-1.rds.amazonaws.com:5432 ec2-user@44.216.237.95
   ```

2. **Get Database Password**
   ```bash
   aws secretsmanager get-secret-value --region us-east-1 --secret-id "arn:aws:secretsmanager:us-east-1:768238136942:secret:pickem-dev-db-credentials-Kg2Zix" --query SecretString --output text
   ```

3. **DBeaver Configuration**
   - **Host**: `localhost`
   - **Port**: `5433`
   - **Database**: `pickem`
   - **Username**: `pickemadmin`
   - **Password**: [from step 2]
   - **Driver Properties**: `sslmode=require`
   - **SSH Tab**: Leave disabled (manual tunnel used)

4. **PostgreSQL CLI Connection**
   ```bash
   psql "postgresql://pickemadmin:PASSWORD@localhost:5433/pickem?sslmode=require"
   ```

#### Notes
- Keep SSH tunnel running while connected to database
- No SSH tunnel configuration needed in DBeaver when using manual tunnel
- Bastion host public IP: `44.216.237.95`

## Troubleshooting

### Database Connection Issues
1. **Connection refused**: Ensure SSH tunnel is running
2. **Authentication failed**: Verify password from AWS Secrets Manager
3. **SSL errors**: Add `sslmode=require` to connection properties

### Common Issues

1. **Domain name conflicts**: Cognito domains must be globally unique
2. **AWS credentials**: Ensure your AWS credentials have sufficient permissions
3. **Region availability**: Some services may not be available in all regions

### Useful Commands

```bash
# Format code
terraform fmt

# Validate configuration
terraform validate

# Show current state
terraform show

# Import existing resources
terraform import aws_cognito_user_pool.example us-west-2_abc123

# Destroy infrastructure
terraform destroy
```