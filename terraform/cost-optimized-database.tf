# Cost-Optimized Database Configuration for 50 Users
# This replaces Aurora Serverless v2 with standard RDS PostgreSQL

# Standard RDS PostgreSQL Instance (Cost-Optimized)
resource "aws_db_instance" "pickem_cost_optimized_db" {
  
  identifier = "${local.project_name}-${var.environment}-cost-optimized-db"
  
  # Engine Configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t4g.micro"  # $15-20/month instead of $100+/month
  
  # Database Configuration
  db_name  = local.database_name
  username = var.db_username
  password = random_password.db_password.result
  
  # Storage Configuration - Cost Optimized
  allocated_storage     = 20  # GB - minimum for PostgreSQL
  max_allocated_storage = 100 # Auto-scaling limit
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.pickem_key.arn
  
  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.pickem_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_security_group.id]
  publicly_accessible    = false
  
  # Single AZ for cost savings (not Multi-AZ)
  multi_az = false
  
  # Backup Configuration - Minimal
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Performance Configuration - Basic
  performance_insights_enabled = false  # Saves $7-10/month
  monitoring_interval         = 0       # No enhanced monitoring
  
  # Security
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
  
  # Parameter Group - Cost Optimized
  parameter_group_name = aws_db_parameter_group.pickem_cost_optimized_pg.name
  
  tags = merge(local.common_tags, {
    Name        = "${local.project_name}-${var.environment}-cost-optimized-db"
    CostProfile = "optimized"
  })
}

# Cost-Optimized Parameter Group
resource "aws_db_parameter_group" "pickem_cost_optimized_pg" {
  
  family = "postgres15"
  name   = "${local.project_name}-${var.environment}-cost-optimized-pg"

  # Basic logging only
  parameter {
    name  = "log_statement"
    value = "none"  # Minimal logging to reduce I/O costs
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "5000"  # Only log very slow queries
  }

  # Connection limits for small instance
  parameter {
    name  = "max_connections"
    value = "25"  # Appropriate for 50 users
  }

  # Memory settings for t4g.micro (1GB RAM)
  parameter {
    name  = "shared_buffers"
    value = "32MB"  # Conservative for small instance
  }

  parameter {
    name  = "work_mem"
    value = "4MB"   # Small work memory
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "64MB"
  }

  # Basic performance settings
  parameter {
    name  = "effective_cache_size"
    value = "256MB"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-cost-optimized-parameter-group"
  })
}


# Cost-Optimized Outputs
output "cost_optimized_db_endpoint" {
  description = "Cost-optimized database endpoint"
  value       = aws_db_instance.pickem_cost_optimized_db.endpoint
  sensitive   = true
}

output "cost_optimized_db_port" {
  description = "Cost-optimized database port"
  value       = aws_db_instance.pickem_cost_optimized_db.port
}

output "monthly_cost_estimate" {
  description = "Estimated monthly cost in USD"
  value = {
    database = "$15-20"
    total    = "$62-65"
    savings  = "85% vs Aurora Serverless v2"
  }
}