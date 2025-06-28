# Database Module - Cost-Optimized RDS PostgreSQL

# DB Subnet Group for RDS
resource "aws_db_subnet_group" "pickem_db_subnet_group" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# Security Group for Database
resource "aws_security_group" "database_security_group" {
  name_prefix = "${var.project_name}-${var.environment}-db-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.lambda_security_group_id]
    description     = "PostgreSQL access from Lambda functions"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-sg"
  })
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Secrets Manager secret for database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}-${var.environment}-db-credentials"
  description             = "Database credentials for PickEm application"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-credentials"
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

# Parameter Group for cost-optimized PostgreSQL
resource "aws_db_parameter_group" "cost_optimized_postgres" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-cost-optimized-postgres15"

  # Optimized for small instance with 1GB RAM
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "none"  # Reduce logging for cost optimization
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "5000"  # Only log slow queries (>5s)
  }

  parameter {
    name  = "max_connections"
    value = "20"  # Reduced for small instance
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"  # 25% of memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of memory
  }

  parameter {
    name  = "work_mem"
    value = "4096"  # 4MB - conservative for small instance
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "64000"  # 64MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16000"  # 16MB
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"  # Optimized for SSD
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"  # SSD optimization
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-cost-optimized-postgres15"
  })
}

# Cost-Optimized RDS PostgreSQL Instance
resource "aws_db_instance" "pickem_cost_optimized_db" {
  identifier     = "${var.project_name}-${var.environment}-cost-optimized-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = var.kms_key_arn

  db_name  = "pickem"
  username = var.db_username
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.database_security_group.id]
  db_subnet_group_name   = aws_db_subnet_group.pickem_db_subnet_group.name
  parameter_group_name   = aws_db_parameter_group.cost_optimized_postgres.name

  # Cost optimization settings
  multi_az               = var.enable_multi_az
  publicly_accessible    = false
  backup_retention_period = var.backup_retention_days
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "Sun:04:00-Sun:05:00"  # UTC
  deletion_protection    = var.enable_deletion_protection

  # Performance Insights disabled for cost optimization
  performance_insights_enabled = false

  # Enhanced monitoring disabled for cost optimization
  monitoring_interval = 0

  # Skip final snapshot in non-prod environments
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Backup retention already set above

  apply_immediately = var.environment != "prod"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-cost-optimized-db"
    Type = "Primary"
  })
}