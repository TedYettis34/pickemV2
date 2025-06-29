# Modular Infrastructure Outputs

# Cognito Outputs
output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "user_pool_endpoint" {
  description = "Endpoint name of the Cognito User Pool"
  value       = module.cognito.user_pool_endpoint
}

output "user_pool_domain" {
  description = "Domain name of the Cognito User Pool"
  value       = module.cognito.user_pool_domain
}

output "user_pool_hosted_ui_url" {
  description = "Hosted UI URL for the Cognito User Pool"
  value       = module.cognito.user_pool_hosted_ui_url
}

# Database Outputs
output "database_endpoint" {
  description = "Cost-optimized RDS PostgreSQL endpoint"
  value       = module.database.database_endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = module.database.database_name
}

output "database_port" {
  description = "Database port"
  value       = module.database.database_port
}

output "database_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = module.database.database_credentials_secret_arn
  sensitive   = true
}

# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda_security_group.id
}

# State Management Outputs
output "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  value       = module.state_backend.terraform_state_bucket
}

output "terraform_state_dynamodb_table" {
  description = "DynamoDB table for Terraform state locking"
  value       = module.state_backend.terraform_state_dynamodb_table
}

output "cloudtrail_s3_bucket" {
  description = "S3 bucket for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail_logs.bucket
}

# NAT Instance Outputs (conditional)
output "nat_instance_ip" {
  description = "Public IP of NAT Instance"
  value       = var.use_nat_instance ? module.nat_instance[0].nat_instance_ip : null
}

output "nat_instance_id" {
  description = "Instance ID of NAT Instance"
  value       = var.use_nat_instance ? module.nat_instance[0].nat_instance_id : null
}

output "nat_cost_analysis" {
  description = "Cost comparison between NAT Gateway and NAT Instance"
  value = var.use_nat_instance ? module.nat_instance[0].nat_cost_analysis : {
    nat_gateway_monthly_cost  = "$45.00 (service) + $12.15 (data) = $57.15"
    nat_instance_monthly_cost = "Not using NAT Instance"
    annual_savings            = "N/A"
    current_configuration     = "NAT Gateway"
    cost_savings_percentage   = "N/A"
  }
}

# Monitoring Outputs
output "nat_instance_cloudwatch_log_group" {
  description = "CloudWatch log group for NAT instance"
  value       = module.monitoring.nat_instance_cloudwatch_log_group
}

output "nat_instance_sns_topic" {
  description = "SNS topic for NAT instance alerts"
  value       = module.monitoring.nat_instance_sns_topic
}

output "nat_instance_dashboard_url" {
  description = "URL for NAT instance CloudWatch dashboard"
  value       = module.monitoring.nat_instance_dashboard_url
}