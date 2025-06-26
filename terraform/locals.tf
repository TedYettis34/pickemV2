locals {
  project_name = "pickem"
  
  common_tags = {
    Project     = local.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  user_pool_name   = "${local.project_name}-user-pool"
  client_name      = "${local.project_name}-web-client"
  domain_prefix    = "${local.project_name}-${var.environment}"
}