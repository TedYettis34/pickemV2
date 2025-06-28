# Monitoring Module Outputs

output "nat_instance_cloudwatch_log_group" {
  description = "CloudWatch log group for NAT instance"
  value       = var.use_nat_instance ? aws_cloudwatch_log_group.nat_instance[0].name : null
}

output "nat_instance_sns_topic" {
  description = "SNS topic for NAT instance alerts"
  value       = var.use_nat_instance ? aws_sns_topic.nat_instance_alerts[0].arn : null
}

output "nat_instance_dashboard_url" {
  description = "URL for NAT instance CloudWatch dashboard"
  value       = var.use_nat_instance ? "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.nat_instance_dashboard[0].dashboard_name}" : null
}

output "general_alerts_topic" {
  description = "SNS topic for general alerts (production only)"
  value       = var.environment == "prod" ? aws_sns_topic.alerts[0].arn : null
}

output "nat_recovery_lambda_function" {
  description = "NAT recovery Lambda function name"
  value       = var.use_nat_instance && var.enable_automated_recovery ? aws_lambda_function.nat_recovery[0].function_name : null
}