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

## Troubleshooting

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