# Bastion Host Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where bastion will be deployed"
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID for bastion host"
  type        = string
}

variable "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret in Secrets Manager"
  type        = string
}

variable "bastion_instance_type" {
  description = "Instance type for bastion host"
  type        = string
  default     = "t3.nano"
  
  validation {
    condition     = can(regex("^(t3|t4g)\\.(nano|micro|small)", var.bastion_instance_type))
    error_message = "Bastion instance type must be a cost-optimized instance (t3.nano, t3.micro, t3.small, t4g.nano, t4g.micro, t4g.small)."
  }
}

variable "bastion_key_pair_name" {
  description = "EC2 Key Pair name for bastion host SSH access"
  type        = string
  default     = ""
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access to bastion host"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  
  validation {
    condition = alltrue([
      for cidr in var.admin_cidr_blocks :
      can(cidrhost(cidr, 0)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Admin CIDR blocks must be valid and cannot include 0.0.0.0/0 for security."
  }
}

variable "use_elastic_ip" {
  description = "Whether to assign an Elastic IP to the bastion host"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}