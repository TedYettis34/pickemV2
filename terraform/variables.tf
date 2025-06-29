variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be in the format 'us-east-1', 'eu-west-1', etc."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Database variables
variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "pickemadmin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"

  validation {
    condition     = can(regex("^db\\.(r6g|r5|t3|t4g)\\.", var.db_instance_class))
    error_message = "DB instance class must be a valid Aurora PostgreSQL instance type."
  }
}

# VPC and networking variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_1_cidr" {
  description = "CIDR block for public subnet 1"
  type        = string
  default     = "10.0.1.0/24"
}

variable "public_subnet_2_cidr" {
  description = "CIDR block for public subnet 2"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_1_cidr" {
  description = "CIDR block for private subnet 1"
  type        = string
  default     = "10.0.3.0/24"
}

variable "private_subnet_2_cidr" {
  description = "CIDR block for private subnet 2"
  type        = string
  default     = "10.0.4.0/24"
}

# Additional best practice variables
variable "cost_center" {
  description = "Cost center for billing and cost allocation"
  type        = string
  default     = "engineering"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "admin"
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
  description = "Enable deletion protection for RDS cluster"
  type        = bool
  default     = false
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

# Aurora Serverless v2 variables
variable "serverless_min_capacity" {
  description = "Minimum Aurora Serverless v2 capacity units"
  type        = number
  default     = 0.5

  validation {
    condition     = var.serverless_min_capacity >= 0.5 && var.serverless_min_capacity <= 128
    error_message = "Serverless min capacity must be between 0.5 and 128 ACUs."
  }
}

variable "serverless_max_capacity" {
  description = "Maximum Aurora Serverless v2 capacity units"
  type        = number
  default     = 4

  validation {
    condition     = var.serverless_max_capacity >= 0.5 && var.serverless_max_capacity <= 128
    error_message = "Serverless max capacity must be between 0.5 and 128 ACUs."
  }
}

# Cost optimization mode
variable "cost_optimized_mode" {
  description = "Enable cost optimization for small deployments (50 users or less)"
  type        = bool
  default     = true
}

# NAT Instance variables
variable "use_nat_instance" {
  description = "Use NAT Instance instead of NAT Gateway for cost optimization"
  type        = bool
  default     = true
}

variable "nat_instance_type" {
  description = "Instance type for NAT Instance"
  type        = string
  default     = "t3.nano"

  validation {
    condition     = can(regex("^(t3|t4g)\\.(nano|micro|small)", var.nat_instance_type))
    error_message = "NAT instance type must be a cost-optimized instance (t3.nano, t3.micro, t3.small, t4g.nano, t4g.micro, t4g.small)."
  }
}

variable "nat_key_pair_name" {
  description = "EC2 Key Pair name for NAT Instance management"
  type        = string
  default     = ""
}

variable "nat_instance_ha_enabled" {
  description = "Enable high availability for NAT Instance using Auto Scaling Group"
  type        = bool
  default     = false
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access to NAT Instance (production)"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"] # Private networks only

  validation {
    condition = alltrue([
      for cidr in var.admin_cidr_blocks :
      can(cidrhost(cidr, 0)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Admin CIDR blocks must be valid and cannot include 0.0.0.0/0 for security."
  }
}


variable "enable_nat_auto_recovery" {
  description = "Enable auto scaling group for NAT instance automatic recovery"
  type        = bool
  default     = false
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

# Bastion Host variables
variable "create_bastion_host" {
  description = "Whether to create a bastion host for database access"
  type        = bool
  default     = true
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

variable "bastion_use_elastic_ip" {
  description = "Whether to assign an Elastic IP to the bastion host"
  type        = bool
  default     = true
}