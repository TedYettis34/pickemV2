# Database Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets for database"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "pickemadmin"
}

variable "db_instance_class" {
  description = "RDS instance class for cost optimization"
  type        = string
  default     = "db.t4g.micro"
  
  validation {
    condition = can(regex("^db\\.(t3|t4g)\\.(nano|micro|small)", var.db_instance_class))
    error_message = "DB instance class must be a cost-optimized instance type."
  }
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS instance"
  type        = bool
  default     = false
}

variable "bastion_security_group_id" {
  description = "Security group ID for bastion host access"
  type        = string
  default     = null
}

variable "nat_instance_security_group_id" {
  description = "Security group ID for NAT instance (PgBouncer) access"
  type        = string
  default     = null
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}