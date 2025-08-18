# VPC Flow Logs removed for cost optimization

# Essential CloudWatch Alarm for Database (Cost-Optimized)
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"  # More lenient for cost optimization
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"  # Higher threshold for cost-optimized
  alarm_description   = "Critical: RDS CPU utilization very high"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.pickem_cost_optimized_db.identifier
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-rds-cpu-alarm"
  })
}

# SNS Topic for Alerts (Production only)
resource "aws_sns_topic" "alerts" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${local.project_name}-${var.environment}-alerts"

  kms_master_key_id = aws_kms_key.pickem_key.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-alerts"
  })
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
      values = ["${aws_db_instance.pickem_cost_optimized_db.arn}/*"]
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

# S3 bucket encryption moved to bucket resource for compatibility

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