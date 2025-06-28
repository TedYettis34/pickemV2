resource "aws_cognito_user_pool" "pickem_user_pool" {
  name = local.user_pool_name

  auto_verified_attributes = ["email"]
  
  # MFA Configuration
  mfa_configuration = var.environment == "prod" ? "ON" : "OPTIONAL"
  
  software_token_mfa_configuration {
    enabled = true
  }
  
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
    temporary_password_validity_days = 7
  }
  
  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  
  # Advanced security features
  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "AUDIT"
  }

  # account_recovery_setting {
  #   recovery_mechanism {
  #     name     = "verified_email"
  #     priority = 1
  #   }
  # }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "name"
    required            = true
    mutable             = true
  }

  tags = merge(local.common_tags, {
    Name = "PickEm User Pool"
  })
}

resource "aws_cognito_user_pool_client" "pickem_user_pool_client" {
  name         = local.client_name
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id

  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
  
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
}

resource "aws_cognito_user_pool_domain" "pickem_domain" {
  domain       = "${local.domain_prefix}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id
}

resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Cognito User Pool Group for Admins (using supported resource type)
resource "aws_cognito_user_group" "admin_group" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.pickem_user_pool.id
  description  = "Administrator group for PickEm application"
  precedence   = 1

  role_arn = aws_iam_role.admin_group_role.arn
}

# IAM Role for Admin Group
resource "aws_iam_role" "admin_group_role" {
  name = "${local.project_name}-${var.environment}-admin-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pickem_user_pool.id}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_user_pool.pickem_user_pool.id
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-admin-group-role"
  })
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}