# NAT Instance Module Variables

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

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_id" {
  description = "ID of the public subnet for NAT instance"
  type        = string
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks of private subnets"
  type        = list(string)
}

variable "nat_instance_type" {
  description = "Instance type for NAT Instance"
  type        = string
  default     = "t3.nano"
  
  validation {
    condition = can(regex("^(t3|t4g)\\.(nano|micro|small)", var.nat_instance_type))
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
  description = "CIDR blocks allowed for SSH access to NAT Instance"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}