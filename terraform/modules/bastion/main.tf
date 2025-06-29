# Bastion Host Module - Secure database access
# This module creates a bastion host in a public subnet for secure SSH tunneling to the database

# Data source for Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_bastion" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for Bastion Host
resource "aws_security_group" "bastion_sg" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-sg"
  vpc_id      = var.vpc_id

  # SSH access from admin networks only
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "SSH access from admin networks"
  }

  # All outbound traffic (needed for database connections and updates)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bastion-sg"
    Type = "Bastion"
  })
}

# IAM Role for Bastion Host
resource "aws_iam_role" "bastion_role" {
  name = "${var.project_name}-${var.environment}-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bastion-role"
  })
}

# IAM Policy for Bastion Host (Secrets Manager access for database credentials)
resource "aws_iam_role_policy" "bastion_policy" {
  name = "${var.project_name}-${var.environment}-bastion-policy"
  role = aws_iam_role.bastion_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.db_credentials_secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:UpdateInstanceInformation",
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:DescribeInstanceInformation",
          "ssm:ListCommands",
          "ssm:ListCommandInvocations"
        ]
        Resource = "*"
      }
    ]
  })
}

# Instance Profile for Bastion Host
resource "aws_iam_instance_profile" "bastion_profile" {
  name = "${var.project_name}-${var.environment}-bastion-profile"
  role = aws_iam_role.bastion_role.name

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bastion-profile"
  })
}

# User Data Script for Bastion Host
locals {
  bastion_user_data = base64encode(templatefile("${path.module}/bastion-userdata.sh", {
    db_credentials_secret_arn = var.db_credentials_secret_arn
    aws_region               = var.aws_region
  }))
}

# Bastion Host Instance
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux_bastion.id
  instance_type = var.bastion_instance_type
  key_name      = var.bastion_key_pair_name != "" ? var.bastion_key_pair_name : null

  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.bastion_profile.name
  associate_public_ip_address = true

  user_data = local.bastion_user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bastion"
    Type = "Bastion"
  })
}

# Elastic IP for Bastion Host (optional but recommended)
resource "aws_eip" "bastion_eip" {
  count    = var.use_elastic_ip ? 1 : 0
  domain   = "vpc"
  instance = aws_instance.bastion.id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bastion-eip"
    Type = "Bastion"
  })

  depends_on = [aws_instance.bastion]
}