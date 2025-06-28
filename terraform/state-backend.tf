# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket        = "${local.project_name}-${var.environment}-terraform-state-${random_string.state_suffix.result}"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.project_name}-${var.environment}-terraform-state"
    Purpose     = "Terraform State Storage"
    Criticality = "High"
  })
}

# Versioning for state bucket
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption for state bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.pickem_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_state_locks" {
  name         = "${local.project_name}-${var.environment}-terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.pickem_key.arn
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.project_name}-${var.environment}-terraform-state-locks"
    Purpose     = "Terraform State Locking"
    Criticality = "High"
  })
}

# Random suffix for unique bucket naming
resource "random_string" "state_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Lifecycle policy for state bucket
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = var.environment == "prod" ? 90 : 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}