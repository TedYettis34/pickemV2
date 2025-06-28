# State Backend Module

This module creates the necessary infrastructure for storing Terraform state files securely in AWS, including S3 bucket for state storage and DynamoDB table for state locking. This is essential for team collaboration and preventing concurrent modifications.

## Architecture

- **S3 Bucket**: Secure storage for Terraform state files with versioning and encryption
- **DynamoDB Table**: State locking mechanism to prevent concurrent operations
- **KMS Encryption**: Customer-managed encryption for all state data
- **Lifecycle Management**: Automated cleanup of old state versions
- **Security Controls**: Public access blocking and bucket policies

## Features

### State Storage
- Versioned S3 bucket for state file history
- Server-side encryption with customer-managed KMS keys
- Lifecycle policies for cost optimization
- Public access blocking for security

### State Locking
- DynamoDB table with pay-per-request billing
- Consistent state locking across team members
- Point-in-time recovery for production environments
- Server-side encryption for lock metadata

### Security
- All data encrypted at rest and in transit
- IAM integration for access control
- Bucket policies for additional security
- Prevent accidental deletion in production

## Usage

### Basic Usage

```hcl
module "state_backend" {
  source = "./modules/state-backend"

  project_name = "myapp"
  environment  = "dev"
  kms_key_arn  = aws_kms_key.app_key.arn
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### Production Configuration

```hcl
module "state_backend" {
  source = "./modules/state-backend"

  project_name = "myapp"
  environment  = "prod"
  kms_key_arn  = aws_kms_key.prod_key.arn
  
  common_tags = {
    Project      = "myapp"
    Environment  = "prod"
    ManagedBy    = "terraform"
    Criticality  = "high"
    BackupPolicy = "required"
  }
}
```

### Multi-Environment Setup

```hcl
# Development state backend
module "state_backend_dev" {
  source = "./modules/state-backend"

  project_name = "myapp"
  environment  = "dev"
  kms_key_arn  = aws_kms_key.dev_key.arn
  
  common_tags = local.dev_tags
}

# Production state backend
module "state_backend_prod" {
  source = "./modules/state-backend"

  project_name = "myapp"
  environment  = "prod"
  kms_key_arn  = aws_kms_key.prod_key.arn
  
  common_tags = local.prod_tags
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| kms_key_arn | ARN of the KMS key for encryption | `string` | n/a | yes |
| common_tags | Common tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| terraform_state_bucket | S3 bucket name for Terraform state |
| terraform_state_dynamodb_table | DynamoDB table name for state locking |
| state_bucket_arn | ARN of the state bucket |

## Backend Configuration

After deploying this module, configure your Terraform backend:

### Basic Backend Configuration

```hcl
# terraform.tf
terraform {
  backend "s3" {
    bucket         = "myapp-dev-terraform-state-abcd1234"
    key            = "myapp/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "myapp-dev-terraform-state-locks"
    encrypt        = true
  }
}
```

### Environment-Specific Backend

```hcl
# environments/dev/terraform.tf
terraform {
  backend "s3" {
    bucket         = "myapp-dev-terraform-state-abcd1234"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "myapp-dev-terraform-state-locks"
    encrypt        = true
  }
}

# environments/prod/terraform.tf
terraform {
  backend "s3" {
    bucket         = "myapp-prod-terraform-state-efgh5678"
    key            = "environments/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "myapp-prod-terraform-state-locks"
    encrypt        = true
  }
}
```

## Bootstrap Process

Since this module creates the backend infrastructure, you need to bootstrap it:

### Step 1: Initial Deployment (Local State)

```bash
# Deploy with local state first
terraform init
terraform plan
terraform apply

# Note the bucket name from outputs
terraform output terraform_state_bucket
```

### Step 2: Configure Backend

```hcl
# Add backend configuration to terraform.tf
terraform {
  backend "s3" {
    bucket         = "myapp-dev-terraform-state-abcd1234"  # From step 1 output
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "myapp-dev-terraform-state-locks"
    encrypt        = true
  }
}
```

### Step 3: Migrate State

```bash
# Reinitialize with backend
terraform init

# Terraform will prompt to migrate state
# Answer 'yes' to copy local state to S3
```

### Step 4: Verify Migration

```bash
# Verify state is in S3
aws s3 ls s3://myapp-dev-terraform-state-abcd1234/

# Test locking
terraform plan  # Should acquire lock in DynamoDB
```

## Security Features

### S3 Bucket Security

```hcl
# Versioning enabled
versioning_configuration {
  status = "Enabled"
}

# Public access blocked
block_public_acls       = true
block_public_policy     = true
ignore_public_acls      = true
restrict_public_buckets = true

# Server-side encryption
apply_server_side_encryption_by_default {
  kms_master_key_id = var.kms_key_arn
  sse_algorithm     = "aws:kms"
}
```

### DynamoDB Security

```hcl
# Server-side encryption
server_side_encryption {
  enabled     = true
  kms_key_arn = var.kms_key_arn
}

# Point-in-time recovery (production)
point_in_time_recovery {
  enabled = var.environment == "prod"
}
```

### IAM Policies

#### Terraform Execution Role Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::myapp-dev-terraform-state-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::myapp-dev-terraform-state-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/myapp-dev-terraform-state-locks"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:*:*:key/*"
    }
  ]
}
```

#### Read-Only Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::myapp-dev-terraform-state-*",
        "arn:aws:s3:::myapp-dev-terraform-state-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/myapp-dev-terraform-state-locks"
    }
  ]
}
```

## Cost Optimization

### S3 Storage Costs

```hcl
# Lifecycle policy for cost optimization
rule {
  id     = "terraform_state_lifecycle"
  status = "Enabled"

  filter {
    prefix = ""
  }

  # Delete old versions after 30-90 days
  noncurrent_version_expiration {
    noncurrent_days = var.environment == "prod" ? 90 : 30
  }

  # Clean up incomplete uploads
  abort_incomplete_multipart_upload {
    days_after_initiation = 7
  }
}
```

### DynamoDB Costs

```hcl
# Pay-per-request billing (cost-effective for state locking)
billing_mode = "PAY_PER_REQUEST"
```

### Monthly Cost Estimate

| Component | Development | Production |
|-----------|------------|------------|
| S3 Storage (1GB) | $0.023 | $0.023 |
| S3 Requests | $0.01 | $0.05 |
| DynamoDB R/W | $0.05 | $0.20 |
| KMS Operations | $0.01 | $0.05 |
| **Total** | **~$0.10** | **~$0.30** |

## State Management Best Practices

### State File Organization

```
s3://myapp-prod-terraform-state-bucket/
├── environments/
│   ├── dev/
│   │   ├── networking/terraform.tfstate
│   │   ├── database/terraform.tfstate
│   │   └── monitoring/terraform.tfstate
│   ├── staging/
│   │   └── terraform.tfstate
│   └── prod/
│       └── terraform.tfstate
├── modules/
│   └── shared/terraform.tfstate
└── global/
    └── terraform.tfstate
```

### Team Workflow

1. **Initialize**: `terraform init`
2. **Plan**: `terraform plan` (acquires lock)
3. **Apply**: `terraform apply` (maintains lock)
4. **Release**: Lock released automatically after apply

### Concurrent Access Protection

```bash
# User A runs plan (acquires lock)
terraform plan

# User B tries to run plan (blocked by lock)
terraform plan
# Error: Error acquiring state lock. Lock Info:
#   ID:        12345678-1234-1234-1234-123456789012
#   Path:      myapp-dev-terraform-state-bucket/terraform.tfstate
#   Operation: OperationTypePlan
#   Who:       user@example.com
#   Version:   1.0.0
#   Created:   2024-01-15 10:30:00.123456 +0000 UTC
#   Info:      
```

## Monitoring and Troubleshooting

### CloudWatch Metrics

Monitor state backend usage:

```bash
# S3 bucket metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=myapp-dev-terraform-state-bucket \
             Name=StorageType,Value=StandardStorage \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average

# DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=myapp-dev-terraform-state-locks \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 300 \
  --statistics Sum
```

### Common Issues and Solutions

#### 1. State Lock Stuck

```bash
# List current locks
aws dynamodb scan --table-name myapp-dev-terraform-state-locks

# Force unlock (use carefully!)
terraform force-unlock LOCK_ID

# Example
terraform force-unlock 12345678-1234-1234-1234-123456789012
```

#### 2. State File Corruption

```bash
# List state versions
aws s3api list-object-versions \
  --bucket myapp-dev-terraform-state-bucket \
  --prefix terraform.tfstate

# Restore previous version
aws s3api copy-object \
  --copy-source myapp-dev-terraform-state-bucket/terraform.tfstate?versionId=VERSION_ID \
  --bucket myapp-dev-terraform-state-bucket \
  --key terraform.tfstate
```

#### 3. Access Permission Issues

```bash
# Test S3 access
aws s3 ls s3://myapp-dev-terraform-state-bucket/

# Test DynamoDB access
aws dynamodb describe-table --table-name myapp-dev-terraform-state-locks

# Test KMS access
aws kms describe-key --key-id arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

## Backup and Recovery

### Automated Backup

```bash
#!/bin/bash
# backup-terraform-state.sh

BUCKET="myapp-prod-terraform-state-bucket"
BACKUP_BUCKET="myapp-prod-terraform-state-backup"
DATE=$(date +%Y%m%d-%H%M%S)

# Sync current state to backup bucket
aws s3 sync s3://$BUCKET s3://$BACKUP_BUCKET/backups/$DATE/

# Create backup manifest
aws s3api list-objects-v2 --bucket $BUCKET --output json > backup-manifest-$DATE.json
aws s3 cp backup-manifest-$DATE.json s3://$BACKUP_BUCKET/manifests/

echo "Backup completed: $DATE"
```

### Cross-Region Replication

```hcl
resource "aws_s3_bucket_replication_configuration" "state_replication" {
  count  = var.environment == "prod" ? 1 : 0
  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "state_replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.terraform_state_replica[0].arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica[0].arn
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.terraform_state]
}
```

## Advanced Configuration

### Multi-Account Setup

```hcl
# Cross-account state access
resource "aws_s3_bucket_policy" "state_cross_account" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::ACCOUNT-A:role/TerraformExecutionRole",
            "arn:aws:iam::ACCOUNT-B:role/TerraformExecutionRole"
          ]
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      }
    ]
  })
}
```

### Remote State Data Source

```hcl
# Reference state from another configuration
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "myapp-prod-terraform-state-bucket"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs from remote state
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_id
  # ... other configuration
}
```

### State Import/Export

```bash
# Export current state
terraform show -json > current-state.json

# Import existing resource
terraform import aws_instance.example i-1234567890abcdef0

# Move state between configurations
terraform state mv aws_instance.old aws_instance.new

# Remove resource from state
terraform state rm aws_instance.example
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Init
        run: terraform init
      
      - name: Terraform Plan
        run: terraform plan -out=tfplan
      
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

### GitLab CI

```yaml
stages:
  - validate
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}
  TF_STATE_NAME: ${CI_COMMIT_REF_SLUG}

.terraform:
  image: hashicorp/terraform:1.5.0
  before_script:
    - cd ${TF_ROOT}
    - terraform init

validate:
  extends: .terraform
  stage: validate
  script:
    - terraform validate

plan:
  extends: .terraform
  stage: plan
  script:
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - ${TF_ROOT}/tfplan

apply:
  extends: .terraform
  stage: apply
  script:
    - terraform apply tfplan
  dependencies:
    - plan
  only:
    - main
```

## Dependencies

This module requires:
- **AWS Provider**: >= 5.0
- **Random Provider**: >= 3.1
- **KMS Key**: Must exist before deployment
- **IAM Permissions**: For S3, DynamoDB, and KMS operations

## Version History

- **v1.0**: Basic S3 and DynamoDB state backend
- **v1.1**: Added KMS encryption and versioning
- **v1.2**: Lifecycle policies and cost optimization
- **v1.3**: Enhanced security and monitoring
- **v2.0**: Modular architecture and comprehensive documentation