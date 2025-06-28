# NAT Instance Monitoring and Alerting Configuration
# Provides comprehensive monitoring for NAT instance health and performance

# SNS Topic for NAT Instance Alerts
resource "aws_sns_topic" "nat_instance_alerts" {
  count = var.use_nat_instance ? 1 : 0
  name  = "${local.project_name}-${var.environment}-nat-instance-alerts"

  kms_master_key_id = aws_kms_key.pickem_key.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-alerts"
  })
}

# CloudWatch Log Group for NAT Instance
resource "aws_cloudwatch_log_group" "nat_instance" {
  count             = var.use_nat_instance ? 1 : 0
  name              = "/aws/ec2/nat-instance/${local.project_name}-${var.environment}"
  retention_in_days = 7

  kms_key_id = aws_kms_key.pickem_key.arn

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-logs"
  })
}

# CloudWatch Dashboard for NAT Instance
resource "aws_cloudwatch_dashboard" "nat_instance_dashboard" {
  count          = var.use_nat_instance ? 1 : 0
  dashboard_name = "${local.project_name}-${var.environment}-nat-instance-dashboard"

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
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.use_nat_instance ? aws_instance.nat_instance[0].id : ""],
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
            ["CWAgent", "mem_used_percent", "InstanceId", var.use_nat_instance ? aws_instance.nat_instance[0].id : ""],
            [".", "disk_used_percent", ".", ".", "device", "/dev/xvda1", "fstype", "xfs", "path", "/"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Memory and Disk Usage"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["Custom/NAT", "ActiveConnections", "InstanceId", var.use_nat_instance ? aws_instance.nat_instance[0].id : ""]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Active Connections"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["AWS/EC2", "StatusCheckFailed", "InstanceId", var.use_nat_instance ? aws_instance.nat_instance[0].id : ""],
            [".", "StatusCheckFailed_Instance", ".", "."],
            [".", "StatusCheckFailed_System", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Status Checks"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 16
        y      = 6
        width  = 8
        height = 6

        properties = {
          query   = "SOURCE '/aws/ec2/${local.project_name}-${var.environment}-nat-instance'\n| fields @timestamp, @message\n| filter @message like /ERROR/ or @message like /CRITICAL/\n| sort @timestamp desc\n| limit 20"
          region  = var.aws_region
          title   = "Recent Errors"
          view    = "table"
        }
      }
    ]
  })

}

# Additional CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "nat_instance_memory" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-memory"
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
    InstanceId = aws_instance.nat_instance[0].id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_disk" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-disk"
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
    InstanceId = aws_instance.nat_instance[0].id
    device     = "/dev/xvda1"
    fstype     = "xfs"
    path       = "/"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_network_high" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-network-high"
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
    InstanceId = aws_instance.nat_instance[0].id
  }

  tags = local.common_tags
}

# Custom metric for NAT health status
resource "aws_cloudwatch_metric_alarm" "nat_instance_health" {
  count               = var.use_nat_instance ? 1 : 0
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "SetupComplete"
  namespace           = "Custom/NAT"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "This metric monitors NAT instance health check status"
  alarm_actions       = var.use_nat_instance ? [aws_sns_topic.nat_instance_alerts[0].arn] : []
  treat_missing_data  = "breaching"

  dimensions = {
    InstanceId = aws_instance.nat_instance[0].id
  }

  tags = local.common_tags
}

# SNS Topic subscription for email alerts (optional)
resource "aws_sns_topic_subscription" "nat_instance_email_alerts" {
  count     = var.use_nat_instance && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.nat_instance_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda function for automated NAT instance recovery (optional)
resource "aws_lambda_function" "nat_instance_recovery" {
  count         = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  filename      = "nat-recovery.zip"
  function_name = "${local.project_name}-${var.environment}-nat-recovery"
  role          = aws_iam_role.nat_recovery_lambda_role[0].arn
  handler       = "index.handler"
  runtime       = "python3.9"
  timeout       = 300

  source_code_hash = data.archive_file.nat_recovery_lambda_zip[0].output_base64sha256

  environment {
    variables = {
      INSTANCE_ID     = aws_instance.nat_instance[0].id
      ROUTE_TABLE_ID  = aws_route_table.private_route_table.id
      SNS_TOPIC_ARN   = aws_sns_topic.nat_instance_alerts[0].arn
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-recovery-lambda"
  })
}

# Lambda deployment package
data "archive_file" "nat_recovery_lambda_zip" {
  count       = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  type        = "zip"
  output_path = "nat-recovery.zip"
  source {
    content = templatefile("${path.module}/nat-recovery-lambda.py", {
      region = var.aws_region
    })
    filename = "index.py"
  }
}

# IAM role for Lambda function
resource "aws_iam_role" "nat_recovery_lambda_role" {
  count = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  name  = "${local.project_name}-${var.environment}-nat-recovery-lambda-role"

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

  tags = local.common_tags
}

# IAM policy for Lambda function
resource "aws_iam_role_policy" "nat_recovery_lambda_policy" {
  count = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  name  = "${local.project_name}-${var.environment}-nat-recovery-lambda-policy"
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
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:DescribeInstanceStatus"
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

# CloudWatch Event Rule for instance state changes
resource "aws_cloudwatch_event_rule" "nat_instance_state_change" {
  count       = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  name        = "${local.project_name}-${var.environment}-nat-instance-state-change"
  description = "Capture NAT instance state changes"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
    detail = {
      instance-id = [aws_instance.nat_instance[0].id]
      state       = ["stopped", "stopping", "terminated", "terminating"]
    }
  })

  tags = local.common_tags
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "nat_recovery_lambda_target" {
  count     = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  rule      = aws_cloudwatch_event_rule.nat_instance_state_change[0].name
  target_id = "NATRecoveryLambdaTarget"
  arn       = aws_lambda_function.nat_instance_recovery[0].arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch_to_call_nat_recovery" {
  count         = var.use_nat_instance && var.enable_automated_recovery ? 1 : 0
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.nat_instance_recovery[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.nat_instance_state_change[0].arn
}