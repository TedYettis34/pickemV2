# Monitoring Module - NAT Instance and System Monitoring

# SNS Topic for NAT Instance Alerts
resource "aws_sns_topic" "nat_instance_alerts" {
  count = var.use_nat_instance ? 1 : 0
  name  = "${var.project_name}-${var.environment}-nat-instance-alerts"

  kms_master_key_id = var.kms_key_id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-instance-alerts"
  })
}

# CloudWatch Log Group for NAT Instance
resource "aws_cloudwatch_log_group" "nat_instance" {
  count             = var.use_nat_instance ? 1 : 0
  name              = "/aws/ec2/nat-instance/${var.project_name}-${var.environment}"
  retention_in_days = 7

  kms_key_id = var.kms_key_arn

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-instance-logs"
  })
}

# CloudWatch Dashboard for NAT Instance
resource "aws_cloudwatch_dashboard" "nat_instance_dashboard" {
  count          = var.use_nat_instance ? 1 : 0
  dashboard_name = "${var.project_name}-${var.environment}-nat-instance-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.nat_instance_id],
            [".", "NetworkIn", ".", "."],
            [".", "NetworkOut", ".", "."],
            [".", "NetworkPacketsIn", ".", "."],
            [".", "NetworkPacketsOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "NAT Instance Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["CWAgent", "mem_used_percent", "InstanceId", var.nat_instance_id],
            [".", "disk_used_percent", ".", ".", "device", "/dev/xvda1", "fstype", "xfs", "path", "/"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Memory and Disk Usage"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Alarms for NAT Instance
resource "aws_cloudwatch_metric_alarm" "nat_instance_memory" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-nat-instance-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors NAT instance memory utilization"
  alarm_actions       = var.use_nat_instance ? [aws_sns_topic.nat_instance_alerts[0].arn] : []

  dimensions = {
    InstanceId = var.nat_instance_id
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_disk" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-nat-instance-disk-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors NAT instance disk utilization"
  alarm_actions       = var.use_nat_instance ? [aws_sns_topic.nat_instance_alerts[0].arn] : []

  dimensions = {
    InstanceId = var.nat_instance_id
    device     = "/dev/xvda1"
    fstype     = "xfs"
    path       = "/"
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_network" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-nat-instance-network-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "NetworkOut"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "100000000"  # 100MB in bytes
  alarm_description   = "This metric monitors NAT instance high network usage"
  alarm_actions       = var.use_nat_instance ? [aws_sns_topic.nat_instance_alerts[0].arn] : []

  dimensions = {
    InstanceId = var.nat_instance_id
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_health" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-nat-instance-health"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthStatus"
  namespace           = "Custom/NAT"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "This metric monitors NAT instance health check status"
  alarm_actions       = var.use_nat_instance ? [aws_sns_topic.nat_instance_alerts[0].arn] : []
  treat_missing_data  = "breaching"

  dimensions = {
    InstanceId = var.nat_instance_id
  }

  tags = var.common_tags
}

# SNS Topic subscription for email alerts (optional)
resource "aws_sns_topic_subscription" "nat_instance_email_alerts" {
  count     = var.use_nat_instance && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.nat_instance_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda function for automated NAT instance recovery (optional)
resource "aws_lambda_function" "nat_recovery" {
  count = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0

  filename         = data.archive_file.nat_recovery_lambda[0].output_path
  function_name    = "${var.project_name}-${var.environment}-nat-recovery"
  role            = aws_iam_role.nat_recovery_lambda_role[0].arn
  handler         = "nat-recovery-lambda.handler"
  runtime         = "python3.9"
  timeout         = 60
  source_code_hash = data.archive_file.nat_recovery_lambda[0].output_base64sha256

  environment {
    variables = {
      INSTANCE_ID     = var.nat_instance_id
      ROUTE_TABLE_ID  = var.private_route_table_id
      SNS_TOPIC_ARN   = aws_sns_topic.nat_instance_alerts[0].arn
    }
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-recovery-lambda"
  })
}

# Archive NAT recovery Lambda code
data "archive_file" "nat_recovery_lambda" {
  count       = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  type        = "zip"
  source_file = "${path.module}/nat-recovery-lambda.py"
  output_path = "${path.module}/nat-recovery-lambda.zip"
}

# IAM Role for NAT Recovery Lambda
resource "aws_iam_role" "nat_recovery_lambda_role" {
  count = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  name  = "${var.project_name}-${var.environment}-nat-recovery-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-recovery-lambda-role"
  })
}

# IAM Policy for NAT Recovery Lambda
resource "aws_iam_role_policy" "nat_recovery_lambda_policy" {
  count = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  name  = "${var.project_name}-${var.environment}-nat-recovery-lambda-policy"
  role  = aws_iam_role.nat_recovery_lambda_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:DescribeRouteTables",
          "ec2:CreateRoute",
          "ec2:DeleteRoute",
          "ec2:ReplaceRoute"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.nat_instance_alerts[0].arn
      }
    ]
  })
}

# Essential CloudWatch Alarm for Database (Cost-Optimized)
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
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
    DBInstanceIdentifier = var.database_instance_id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-rds-cpu-alarm"
  })
}

# SNS Topic for General Alerts (Production only)
resource "aws_sns_topic" "alerts" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-alerts"

  kms_master_key_id = var.kms_key_id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-alerts"
  })
}