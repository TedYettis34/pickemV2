# NAT Instance Module - Cost-Optimized NAT Solution

# Data source for Amazon Linux NAT AMI
data "aws_ami" "amazon_linux_nat" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn-ami-vpc-nat-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for NAT Instance
resource "aws_security_group" "nat_instance_sg" {
  name_prefix = "${var.project_name}-${var.environment}-nat-sg"
  vpc_id      = var.vpc_id

  # HTTP traffic from private subnets
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
    description = "HTTP from private subnets"
  }

  # HTTPS traffic from private subnets
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
    description = "HTTPS from private subnets"
  }

  # SSH access (restricted based on environment)
  dynamic "ingress" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.admin_cidr_blocks
      description = "SSH access for administration"
    }
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-sg"
  })
}

# Elastic IP for NAT Instance
resource "aws_eip" "nat_instance_eip" {
  domain = "vpc"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-instance-eip"
  })
}

# IAM Role for NAT Instance
resource "aws_iam_role" "nat_instance_role" {
  name = "${var.project_name}-${var.environment}-nat-instance-role"

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
    Name = "${var.project_name}-${var.environment}-nat-instance-role"
  })
}

# IAM Policy for NAT Instance
resource "aws_iam_role_policy" "nat_instance_policy" {
  name = "${var.project_name}-${var.environment}-nat-instance-policy"
  role = aws_iam_role.nat_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeRouteTables",
          "ec2:CreateRoute",
          "ec2:ReplaceRoute",
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
          "logs:CreateLogStream"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "nat_instance_profile" {
  name = "${var.project_name}-${var.environment}-nat-instance-profile"
  role = aws_iam_role.nat_instance_role.name

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-instance-profile"
  })
}

# NAT Instance
resource "aws_instance" "nat_instance" {
  count = var.nat_instance_ha_enabled ? 0 : 1

  ami                         = data.aws_ami.amazon_linux_nat.id
  instance_type               = var.nat_instance_type
  key_name                    = var.nat_key_pair_name != "" ? var.nat_key_pair_name : null
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.nat_instance_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.nat_instance_profile.name
  associate_public_ip_address = true
  source_dest_check           = false

  user_data = base64encode(templatefile("${path.module}/nat-instance-userdata.sh", {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
  }))

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-instance"
    Type = "NAT"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Associate EIP with NAT Instance
resource "aws_eip_association" "nat_instance_eip_association" {
  count       = var.nat_instance_ha_enabled ? 0 : 1
  instance_id = aws_instance.nat_instance[0].id
  allocation_id = aws_eip.nat_instance_eip.id
}

# Launch Template for HA NAT Instance (optional)
resource "aws_launch_template" "nat_instance_template" {
  count = var.nat_instance_ha_enabled ? 1 : 0

  name_prefix   = "${var.project_name}-${var.environment}-nat-instance-"
  image_id      = data.aws_ami.amazon_linux_nat.id
  instance_type = var.nat_instance_type
  key_name      = var.nat_key_pair_name != "" ? var.nat_key_pair_name : null

  vpc_security_group_ids = [aws_security_group.nat_instance_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.nat_instance_profile.name
  }

  user_data = base64encode(templatefile("${path.module}/nat-instance-userdata.sh", {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.common_tags, {
      Name = "${var.project_name}-${var.environment}-nat-instance"
      Type = "NAT"
    })
  }
}

# Auto Scaling Group for HA NAT Instance (optional)
resource "aws_autoscaling_group" "nat_instance_asg" {
  count = var.nat_instance_ha_enabled ? 1 : 0

  name                = "${var.project_name}-${var.environment}-nat-instance-asg"
  vpc_zone_identifier = [var.public_subnet_id]
  target_group_arns   = []
  health_check_type   = "EC2"
  health_check_grace_period = 300

  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.nat_instance_template[0].id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-nat-instance-asg"
    propagate_at_launch = false
  }

  dynamic "tag" {
    for_each = var.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = false
    }
  }
}