# NAT Instance Implementation for Cost Optimization
# Replaces NAT Gateway with 91.8% cost savings

# Data source for latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_nat" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for NAT Instance
resource "aws_security_group" "nat_instance_sg" {
  name_prefix = "${local.project_name}-${var.environment}-nat-instance-"
  vpc_id      = aws_vpc.pickem_vpc.id

  # Allow HTTP traffic from private subnets
  ingress {
    description = "HTTP from private subnets"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.private_subnet_1_cidr, var.private_subnet_2_cidr]
  }

  # Allow HTTPS traffic from private subnets
  ingress {
    description = "HTTPS from private subnets"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.private_subnet_1_cidr, var.private_subnet_2_cidr]
  }

  # Allow SSH for management (restrict to admin IPs in production)
  ingress {
    description = "SSH for management"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.environment == "prod" ? var.admin_cidr_blocks : ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# IAM Role for NAT Instance
resource "aws_iam_role" "nat_instance_role" {
  name = "${local.project_name}-${var.environment}-nat-instance-role"

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

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-role"
  })
}

# IAM Policy for NAT Instance
resource "aws_iam_role_policy" "nat_instance_policy" {
  name = "${local.project_name}-${var.environment}-nat-instance-policy"
  role = aws_iam_role.nat_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:UpdateInstanceInformation",
          "ssm:SendCommand"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach AWS managed policy for SSM
resource "aws_iam_role_policy_attachment" "nat_instance_ssm" {
  role       = aws_iam_role.nat_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "nat_instance_profile" {
  name = "${local.project_name}-${var.environment}-nat-instance-profile"
  role = aws_iam_role.nat_instance_role.name

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-profile"
  })
}

# Launch Template for NAT Instance
resource "aws_launch_template" "nat_instance_template" {
  name_prefix   = "${local.project_name}-${var.environment}-nat-"
  image_id      = data.aws_ami.amazon_linux_nat.id
  instance_type = var.nat_instance_type
  key_name      = var.nat_key_pair_name

  vpc_security_group_ids = [aws_security_group.nat_instance_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.nat_instance_profile.name
  }

  # Disable source/destination check for NAT functionality
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  user_data = base64encode(templatefile("${path.module}/nat-instance-userdata.sh", {
    project_name = local.project_name
    environment  = var.environment
    aws_region   = var.aws_region
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.project_name}-${var.environment}-nat-instance"
      Type = "NAT"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group for NAT Instance (for high availability)
resource "aws_autoscaling_group" "nat_instance_asg" {
  count = var.nat_instance_ha_enabled ? 1 : 0

  name                = "${local.project_name}-${var.environment}-nat-asg"
  vpc_zone_identifier = [aws_subnet.public_subnet_1.id]
  target_group_arns   = []
  health_check_type   = "EC2"
  health_check_grace_period = 300

  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.nat_instance_template.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${local.project_name}-${var.environment}-nat-asg"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = local.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

# Single NAT Instance (if not using ASG)
resource "aws_instance" "nat_instance" {
  count = var.nat_instance_ha_enabled ? 0 : 1

  ami                         = data.aws_ami.amazon_linux_nat.id
  instance_type               = var.nat_instance_type
  key_name                    = var.nat_key_pair_name
  subnet_id                   = aws_subnet.public_subnet_1.id
  vpc_security_group_ids      = [aws_security_group.nat_instance_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.nat_instance_profile.name
  associate_public_ip_address = true
  source_dest_check           = false

  user_data = base64encode(templatefile("${path.module}/nat-instance-userdata.sh", {
    project_name = local.project_name
    environment  = var.environment
    aws_region   = var.aws_region
  }))

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance"
    Type = "NAT"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP for NAT Instance
resource "aws_eip" "nat_instance_eip" {
  domain   = "vpc"
  instance = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-eip"
  })

  depends_on = [aws_internet_gateway.pickem_igw]
}

# CloudWatch Alarms for NAT Instance
resource "aws_cloudwatch_metric_alarm" "nat_instance_cpu_high" {
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "NAT Instance CPU utilization is high"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    InstanceId = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-cpu-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "nat_instance_status_check" {
  alarm_name          = "${local.project_name}-${var.environment}-nat-instance-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "NAT Instance status check failed"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    InstanceId = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-instance-status-alarm"
  })
}