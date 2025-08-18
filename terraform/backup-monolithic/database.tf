# RDS Subnet Group
resource "aws_db_subnet_group" "pickem_db_subnet_group" {
  name       = "${local.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-db-subnet-group"
  })
}

# RDS Security Group
resource "aws_security_group" "rds_security_group" {
  name_prefix = "${local.project_name}-${var.environment}-rds-"
  vpc_id      = aws_vpc.pickem_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_security_group.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}


# Store database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.project_name}-${var.environment}-db-credentials"
  description = "Database credentials for PickEm application"
  
  kms_key_id = aws_kms_key.pickem_key.arn

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-db-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.pickem_cost_optimized_db.endpoint
    port     = aws_db_instance.pickem_cost_optimized_db.port
    dbname   = aws_db_instance.pickem_cost_optimized_db.db_name
  })
}


# KMS Key for encryption
resource "aws_kms_key" "pickem_key" {
  description             = "KMS key for PickEm application"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Service"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager Service"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-kms-key"
  })
}

resource "aws_kms_alias" "pickem_key_alias" {
  name          = "alias/${local.project_name}-${var.environment}"
  target_key_id = aws_kms_key.pickem_key.key_id
}