# Main Terraform Configuration - Modular Architecture
# PickEm Application Infrastructure

# Local values for consistent naming and tagging
locals {
  project_name = "pickem"
  common_tags = {
    Project     = local.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
    Owner       = var.owner
    Backup      = var.environment == "prod" ? "required" : "optional"
  }
}

# KMS Key for encryption
resource "aws_kms_key" "pickem_key" {
  description             = "KMS key for PickEm application encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudTrail to encrypt logs"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-kms-key"
  })
}

# KMS Key Alias
resource "aws_kms_alias" "pickem_key_alias" {
  name          = "alias/${local.project_name}-${var.environment}-key"
  target_key_id = aws_kms_key.pickem_key.key_id
}

# Lambda Security Group (needed by multiple modules)
resource "aws_security_group" "lambda_security_group" {
  name_prefix = "${local.project_name}-${var.environment}-lambda-sg"
  vpc_id      = module.networking.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-lambda-sg"
  })
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  project_name                              = local.project_name
  environment                              = var.environment
  vpc_cidr                                 = var.vpc_cidr
  public_subnet_1_cidr                     = var.public_subnet_1_cidr
  public_subnet_2_cidr                     = var.public_subnet_2_cidr
  private_subnet_1_cidr                    = var.private_subnet_1_cidr
  private_subnet_2_cidr                    = var.private_subnet_2_cidr
  use_nat_instance                         = var.use_nat_instance
  nat_instance_primary_network_interface_id = var.use_nat_instance ? module.nat_instance[0].nat_instance_primary_network_interface_id : null
  common_tags                              = local.common_tags
}

# NAT Instance Module (conditional)
module "nat_instance" {
  count  = var.use_nat_instance ? 1 : 0
  source = "./modules/nat-instance"

  project_name          = local.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_1_id
  private_subnet_cidrs = [var.private_subnet_1_cidr, var.private_subnet_2_cidr]
  nat_instance_type    = var.nat_instance_type
  nat_key_pair_name    = var.nat_key_pair_name
  nat_instance_ha_enabled = var.nat_instance_ha_enabled
  admin_cidr_blocks    = var.admin_cidr_blocks
  common_tags          = local.common_tags
}

# Database Module
module "database" {
  source = "./modules/database"

  project_name               = local.project_name
  environment               = var.environment
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_security_group_id  = aws_security_group.lambda_security_group.id
  kms_key_arn              = aws_kms_key.pickem_key.arn
  db_username              = var.db_username
  db_instance_class        = var.cost_optimized_mode ? "db.t4g.micro" : "db.r6g.large"
  enable_multi_az          = var.enable_multi_az
  backup_retention_days    = var.backup_retention_days
  enable_deletion_protection = var.enable_deletion_protection
  common_tags              = local.common_tags
}

# Cognito Module
module "cognito" {
  source = "./modules/cognito"

  project_name = local.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  common_tags  = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  project_name              = local.project_name
  environment              = var.environment
  aws_region               = var.aws_region
  use_nat_instance         = var.use_nat_instance
  nat_instance_id          = var.use_nat_instance ? module.nat_instance[0].nat_instance_id : null
  database_instance_id     = module.database.database_instance_id
  private_route_table_id   = module.networking.private_route_table_id
  kms_key_id               = aws_kms_key.pickem_key.id
  kms_key_arn              = aws_kms_key.pickem_key.arn
  alert_email              = var.alert_email
  enable_automated_recovery = var.enable_automated_recovery
  common_tags              = local.common_tags
}

# State Backend Module (for infrastructure bootstrap)
module "state_backend" {
  source = "./modules/state-backend"

  project_name = local.project_name
  environment  = var.environment
  kms_key_arn  = aws_kms_key.pickem_key.arn
  common_tags  = local.common_tags
}

# CloudTrail for API Logging
resource "aws_cloudtrail" "pickem_trail" {
  name           = "${local.project_name}-${var.environment}-cloudtrail"
  s3_bucket_name = aws_s3_bucket.cloudtrail_logs.bucket

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []

    data_resource {
      type   = "AWS::RDS::DBInstance"
      values = ["${module.database.database_instance_id}/*"]
    }
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail_logs_policy]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-cloudtrail"
  })
}

# S3 Bucket for CloudTrail Logs
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "${local.project_name}-${var.environment}-cloudtrail-logs-${random_string.bucket_suffix.result}"
  force_destroy = var.environment != "prod"

  tags = merge(local.common_tags, {
    Name    = "${local.project_name}-${var.environment}-cloudtrail-logs"
    Purpose = "CloudTrail Logs"
  })
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "cloudtrail_logs_policy" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
      }
    ]
  })
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}