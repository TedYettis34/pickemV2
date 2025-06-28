# Networking Module

This module creates a complete VPC infrastructure with public and private subnets, internet gateway, route tables, and optional NAT solutions (NAT Gateway or cost-optimized NAT Instance).

## Architecture

- **VPC**: Single VPC with DNS hostnames and DNS support enabled
- **Public Subnets**: 2 subnets across AZs for public resources
- **Private Subnets**: 2 subnets across AZs for private resources
- **Internet Gateway**: For public internet access
- **NAT Solution**: Either NAT Gateway (default) or NAT Instance (cost-optimized)
- **Route Tables**: Proper routing for public and private subnets

## Usage

### Basic Usage (NAT Gateway)

```hcl
module "networking" {
  source = "./modules/networking"

  project_name             = "myapp"
  environment             = "dev"
  vpc_cidr                = "10.0.0.0/16"
  public_subnet_1_cidr    = "10.0.1.0/24"
  public_subnet_2_cidr    = "10.0.2.0/24"
  private_subnet_1_cidr   = "10.0.3.0/24"
  private_subnet_2_cidr   = "10.0.4.0/24"
  use_nat_instance        = false
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### Cost-Optimized Usage (NAT Instance)

```hcl
module "networking" {
  source = "./modules/networking"

  project_name                              = "myapp"
  environment                              = "dev"
  vpc_cidr                                 = "10.0.0.0/16"
  public_subnet_1_cidr                     = "10.0.1.0/24"
  public_subnet_2_cidr                     = "10.0.2.0/24"
  private_subnet_1_cidr                    = "10.0.3.0/24"
  private_subnet_2_cidr                    = "10.0.4.0/24"
  use_nat_instance                         = true
  nat_instance_primary_network_interface_id = module.nat_instance.nat_instance_primary_network_interface_id
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| vpc_cidr | CIDR block for VPC | `string` | n/a | yes |
| public_subnet_1_cidr | CIDR block for public subnet 1 | `string` | n/a | yes |
| public_subnet_2_cidr | CIDR block for public subnet 2 | `string` | n/a | yes |
| private_subnet_1_cidr | CIDR block for private subnet 1 | `string` | n/a | yes |
| private_subnet_2_cidr | CIDR block for private subnet 2 | `string` | n/a | yes |
| use_nat_instance | Use NAT Instance instead of NAT Gateway | `bool` | `false` | no |
| nat_instance_primary_network_interface_id | Primary network interface ID of NAT instance | `string` | `null` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | ID of the VPC |
| vpc_cidr_block | CIDR block of the VPC |
| public_subnet_1_id | ID of public subnet 1 |
| public_subnet_2_id | ID of public subnet 2 |
| private_subnet_1_id | ID of private subnet 1 |
| private_subnet_2_id | ID of private subnet 2 |
| private_subnet_ids | List of private subnet IDs |
| public_subnet_ids | List of public subnet IDs |
| private_route_table_id | ID of the private route table |
| public_route_table_id | ID of the public route table |
| internet_gateway_id | ID of the Internet Gateway |
| nat_gateway_id | ID of the NAT Gateway (if not using NAT instance) |
| nat_gateway_eip | Elastic IP of the NAT Gateway (if not using NAT instance) |

## Cost Considerations

- **NAT Gateway**: ~$45/month + data transfer costs
- **NAT Instance (t3.nano)**: ~$4.70/month (91.8% savings)
- **NAT Instance (t3.micro)**: ~$8.39/month (85.3% savings)

For small deployments (<100 users), NAT Instance provides significant cost savings with minimal performance impact.

## Security

- All subnets are created in separate Availability Zones for high availability
- Private subnets have no direct internet access
- Public subnets use Internet Gateway for outbound traffic
- Route tables properly isolate public and private traffic

## Examples

### Multi-Environment Setup

```hcl
# Development Environment
module "networking_dev" {
  source = "./modules/networking"

  project_name             = "myapp"
  environment             = "dev"
  vpc_cidr                = "10.0.0.0/16"
  public_subnet_1_cidr    = "10.0.1.0/24"
  public_subnet_2_cidr    = "10.0.2.0/24"
  private_subnet_1_cidr   = "10.0.3.0/24"
  private_subnet_2_cidr   = "10.0.4.0/24"
  use_nat_instance        = true  # Cost optimization for dev
  
  common_tags = local.dev_tags
}

# Production Environment
module "networking_prod" {
  source = "./modules/networking"

  project_name             = "myapp"
  environment             = "prod"
  vpc_cidr                = "10.1.0.0/16"
  public_subnet_1_cidr    = "10.1.1.0/24"
  public_subnet_2_cidr    = "10.1.2.0/24"
  private_subnet_1_cidr   = "10.1.3.0/24"
  private_subnet_2_cidr   = "10.1.4.0/24"
  use_nat_instance        = false  # High availability for prod
  
  common_tags = local.prod_tags
}
```

## Dependencies

This module requires:
- AWS Provider >= 5.0
- If using NAT Instance: NAT Instance module must be deployed first

## Notes

- The module automatically selects the first two available AZs in the region
- VPC enables DNS hostnames and DNS support by default
- All resources are tagged consistently using the provided common_tags
- CIDR block validation ensures proper IPv4 format