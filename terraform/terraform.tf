terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Uncomment and configure for production use
  # backend "s3" {
  #   bucket         = "pickem-dev-terraform-state-12345678"  # Will be created by state-backend.tf
  #   key            = "pickem/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "pickem-dev-terraform-state-locks"
  #   encrypt        = true
  # }
}