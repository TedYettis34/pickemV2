output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.pickem_user_pool.id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.pickem_user_pool_client.id
}

output "user_pool_endpoint" {
  description = "Endpoint name of the Cognito User Pool"
  value       = aws_cognito_user_pool.pickem_user_pool.endpoint
}

output "user_pool_domain" {
  description = "Domain name of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.pickem_domain.domain
}

output "user_pool_hosted_ui_url" {
  description = "Hosted UI URL for the Cognito User Pool"
  value       = "https://${aws_cognito_user_pool_domain.pickem_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}