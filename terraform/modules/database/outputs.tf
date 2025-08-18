# Database Module Outputs

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

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database_security_group.id
}

output "database_instance_id" {
  description = "ID of the database instance"
  value       = aws_db_instance.pickem_cost_optimized_db.id
}

output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = aws_db_subnet_group.pickem_db_subnet_group.name
}