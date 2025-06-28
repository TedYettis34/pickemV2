output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.pickem_user_pool.id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.pickem_user_pool_client.id
}

output "user_pool_endpoint" {
  description = "Endpoint name of the Cognito User Pool"
  value       = aws_cognito_user_pool.pickem_user_pool.endpoint
}

output "user_pool_domain" {
  description = "Domain name of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.pickem_domain.domain
}

output "user_pool_hosted_ui_url" {
  description = "Hosted UI URL for the Cognito User Pool"
  value       = "https://${aws_cognito_user_pool_domain.pickem_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}

# Cost-Optimized Database outputs
output "database_endpoint" {
  description = "Cost-optimized RDS PostgreSQL endpoint"
  value       = aws_db_instance.pickem_cost_optimized_db.endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.pickem_cost_optimized_db.db_name
}

output "database_port" {
  description = "Database port"
  value       = aws_db_instance.pickem_cost_optimized_db.port
}

output "database_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

# RDS Proxy removed for cost optimization

# VPC outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.pickem_vpc.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda_security_group.id
}

# State management outputs
output "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_state_dynamodb_table" {
  description = "DynamoDB table for Terraform state locking"
  value       = aws_dynamodb_table.terraform_state_locks.name
}

# VPC Flow Logs removed for cost optimization

output "cloudtrail_s3_bucket" {
  description = "S3 bucket for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail_logs.bucket
}

# NAT Instance outputs
output "nat_instance_ip" {
  description = "Public IP of NAT Instance"
  value       = var.use_nat_instance ? aws_eip.nat_instance_eip.public_ip : null
}

output "nat_instance_id" {
  description = "Instance ID of NAT Instance"
  value       = var.use_nat_instance && !var.nat_instance_ha_enabled ? aws_instance.nat_instance[0].id : null
}

output "nat_cost_analysis" {
  description = "Cost comparison between NAT Gateway and NAT Instance"
  value = {
    nat_gateway_monthly_cost = "$45.00 (service) + $12.15 (data) = $57.15"
    nat_instance_monthly_cost = var.nat_instance_type == "t3.nano" ? "$3.70 (instance) + $1.00 (EIP) = $4.70" : var.nat_instance_type == "t3.micro" ? "$7.39 (instance) + $1.00 (EIP) = $8.39" : var.nat_instance_type == "t3.small" ? "$14.79 (instance) + $1.00 (EIP) = $15.79" : "Custom instance type"
    annual_savings = var.nat_instance_type == "t3.nano" ? "$629.40" : var.nat_instance_type == "t3.micro" ? "$585.12" : var.nat_instance_type == "t3.small" ? "$496.32" : "Variable"
    current_configuration = var.use_nat_instance ? "NAT Instance (${var.nat_instance_type})" : "NAT Gateway"
    cost_savings_percentage = var.nat_instance_type == "t3.nano" ? "91.8%" : var.nat_instance_type == "t3.micro" ? "85.3%" : var.nat_instance_type == "t3.small" ? "72.4%" : "Variable"
  }
}

# Monitoring outputs
output "nat_instance_cloudwatch_log_group" {
  description = "CloudWatch log group for NAT instance"
  value       = var.use_nat_instance ? aws_cloudwatch_log_group.nat_instance[0].name : null
}

output "nat_instance_sns_topic" {
  description = "SNS topic for NAT instance alerts"
  value       = var.use_nat_instance ? aws_sns_topic.nat_instance_alerts[0].arn : null
}