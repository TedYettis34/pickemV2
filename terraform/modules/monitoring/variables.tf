# Monitoring Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "use_nat_instance" {
  description = "Whether NAT instance is being used"
  type        = bool
  default     = false
}

variable "nat_instance_id" {
  description = "ID of the NAT instance to monitor"
  type        = string
  default     = null
}

variable "database_instance_id" {
  description = "ID of the database instance to monitor"
  type        = string
}

variable "private_route_table_id" {
  description = "ID of the private route table for NAT recovery"
  type        = string
  default     = null
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "alert_email" {
  description = "Email address for NAT instance alerts"
  type        = string
  default     = ""
}

variable "enable_automated_recovery" {
  description = "Enable automated recovery Lambda function for NAT instance"
  type        = bool
  default     = false
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}