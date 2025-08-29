# Cognito Module - User Authentication

# Cognito User Pool
resource "aws_cognito_user_pool" "pickem_user_pool" {
  name = "${var.project_name}-${var.environment}-user-pool"

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # User attributes
  alias_attributes = ["email", "preferred_username"]

  # Auto-verified attributes
  auto_verified_attributes = ["email"]

  # Username configuration
  username_configuration {
    case_sensitive = false
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # MFA configuration (required in production)
  mfa_configuration = var.environment == "prod" ? "ON" : "OPTIONAL"

  software_token_mfa_configuration {
    enabled = var.environment == "prod"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = false
  }

  # Verification message template
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject         = "Your ${var.project_name} verification code"
    email_message         = "Your verification code is {####}"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-user-pool"
  })
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "pickem_user_pool_client" {
  name         = "${var.project_name}-${var.environment}-user-pool-client"
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id

  generate_secret = false

  # OAuth flows
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs - dynamically built based on environment and production domain
  callback_urls = compact([
    "http://localhost:3000/auth/callback",
    "https://${var.project_name}-${var.environment}.example.com/auth/callback",
    var.production_domain != "" ? "${var.production_domain}/auth/callback" : null
  ])

  logout_urls = compact([
    "http://localhost:3000/auth/logout",
    "https://${var.project_name}-${var.environment}.example.com/auth/logout",
    var.production_domain != "" ? "${var.production_domain}/auth/logout" : null
  ])

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Enable authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Token validity
  access_token_validity  = 60    # 1 hour
  id_token_validity     = 60    # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Attribute permissions
  read_attributes = [
    "email",
    "email_verified",
    "preferred_username"
  ]

  write_attributes = [
    "email",
    "preferred_username"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Disable token revocation to prevent refresh token invalidation
  enable_token_revocation = false
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "pickem_domain" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id
}

# Admin User Group
resource "aws_cognito_user_group" "admin_group" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id
  description  = "Administrator group with full access to admin features"
  precedence   = 1
}