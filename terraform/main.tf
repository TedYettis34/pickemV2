resource "aws_cognito_user_pool" "pickem_user_pool" {
  name = local.user_pool_name

  auto_verified_attributes = ["email"]
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
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