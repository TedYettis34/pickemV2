# NAT Instance Module

This module creates a cost-optimized NAT Instance solution as an alternative to AWS NAT Gateway. It provides significant cost savings (up to 91.8%) while maintaining internet connectivity for private subnets.

## Architecture

- **NAT Instance**: Amazon Linux NAT AMI on cost-optimized instances
- **Elastic IP**: Static public IP for consistent outbound traffic
- **Security Groups**: Restrictive access with HTTP/HTTPS and optional SSH
- **IAM Role**: Minimal permissions for CloudWatch and EC2 operations
- **Auto Scaling** (Optional): High availability with Auto Scaling Group
- **Monitoring**: CloudWatch integration for health and performance

## Cost Comparison

| Solution | Monthly Cost | Annual Cost | Savings |
|----------|-------------|-------------|---------|
| NAT Gateway | $57.15 | $685.80 | - |
| NAT Instance (t3.nano) | $4.70 | $56.40 | 91.8% |
| NAT Instance (t3.micro) | $8.39 | $100.68 | 85.3% |
| NAT Instance (t3.small) | $15.79 | $189.48 | 72.4% |

## Usage

### Basic Usage (Single Instance)

```hcl
module "nat_instance" {
  source = "./modules/nat-instance"

  project_name          = "myapp"
  environment          = "dev"
  aws_region           = "us-east-1"
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_1_id
  private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
  
  # Instance configuration
  nat_instance_type    = "t3.nano"
  nat_key_pair_name    = "my-key-pair"
  
  # Security configuration
  admin_cidr_blocks    = ["10.0.0.0/8", "172.16.0.0/12"]
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### High Availability Configuration

```hcl
module "nat_instance" {
  source = "./modules/nat-instance"

  project_name          = "myapp"
  environment          = "prod"
  aws_region           = "us-east-1"
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_1_id
  private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
  
  # High availability configuration
  nat_instance_type       = "t3.micro"
  nat_instance_ha_enabled = true
  nat_key_pair_name      = "prod-key-pair"
  
  # Restricted admin access
  admin_cidr_blocks = ["192.168.1.0/24"]  # Office network only
  
  common_tags = local.prod_tags
}
```

### Cost-Optimized Configuration

```hcl
module "nat_instance" {
  source = "./modules/nat-instance"

  project_name          = "myapp"
  environment          = "dev"
  aws_region           = "us-east-1"
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_1_id
  private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
  
  # Maximum cost optimization
  nat_instance_type       = "t3.nano"     # Smallest instance
  nat_instance_ha_enabled = false         # Single instance
  nat_key_pair_name      = ""             # No SSH access
  admin_cidr_blocks      = []             # No admin access
  
  common_tags = local.cost_optimized_tags
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| aws_region | AWS region | `string` | n/a | yes |
| vpc_id | ID of the VPC | `string` | n/a | yes |
| public_subnet_id | ID of the public subnet | `string` | n/a | yes |
| private_subnet_cidrs | CIDR blocks of private subnets | `list(string)` | n/a | yes |
| nat_instance_type | Instance type for NAT Instance | `string` | `"t3.nano"` | no |
| nat_key_pair_name | EC2 Key Pair name for SSH access | `string` | `""` | no |
| nat_instance_ha_enabled | Enable high availability with ASG | `bool` | `false` | no |
| admin_cidr_blocks | CIDR blocks for SSH access | `list(string)` | See below | no |
| common_tags | Common tags to apply to resources | `map(string)` | `{}` | no |

### Default Admin CIDR Blocks
```hcl
["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]  # Private networks only
```

## Outputs

| Name | Description |
|------|-------------|
| nat_instance_id | Instance ID of NAT Instance |
| nat_instance_ip | Public IP of NAT Instance |
| nat_instance_private_ip | Private IP of NAT Instance |
| nat_instance_primary_network_interface_id | Primary network interface ID |
| nat_instance_security_group_id | Security group ID |
| nat_instance_eip_id | Elastic IP allocation ID |
| nat_cost_analysis | Cost comparison and savings analysis |

## Security Features

### Network Security
- **Source/Destination Checks**: Disabled for NAT functionality
- **Security Groups**: Restrictive inbound rules
- **SSH Access**: Optional and restricted to specific CIDR blocks
- **Elastic IP**: Consistent outbound IP for allowlist configurations

### Instance Security
- **Latest AMI**: Amazon Linux NAT AMI with security updates
- **IAM Role**: Minimal permissions for required operations
- **User Data**: Automated configuration and hardening
- **CloudWatch**: Monitoring and logging integration

### Access Control
```hcl
# Security group rules
ingress {
  from_port   = 80
  to_port     = 80
  protocol    = "tcp"
  cidr_blocks = var.private_subnet_cidrs  # Only private subnets
}

ingress {
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = var.private_subnet_cidrs  # Only private subnets
}

# SSH access (production only)
dynamic "ingress" {
  for_each = var.environment == "prod" ? [1] : []
  content {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }
}
```

## Performance Characteristics

### Instance Types

| Type | vCPU | Memory | Network | Monthly Cost | Best For |
|------|------|--------|---------|-------------|----------|
| t3.nano | 2 | 0.5 GB | Up to 5 Gbps | $3.70 | <10 users |
| t3.micro | 2 | 1 GB | Up to 5 Gbps | $7.39 | 10-50 users |
| t3.small | 2 | 2 GB | Up to 5 Gbps | $14.79 | 50-200 users |

### Network Performance
- **Bandwidth**: Up to 5 Gbps for t3 instances
- **Latency**: ~1-2ms additional latency vs NAT Gateway
- **Throughput**: Sufficient for most small-medium workloads
- **Concurrent Connections**: Handles hundreds of concurrent connections

## High Availability Options

### Single Instance (Default)
- **Cost**: Lowest
- **Availability**: Single point of failure
- **Recovery**: Manual or automated via monitoring

### Auto Scaling Group
- **Cost**: Minimal additional cost
- **Availability**: Automatic recovery
- **Recovery**: Auto Scaling replaces failed instances

```hcl
# Enable HA mode
nat_instance_ha_enabled = true
```

## Monitoring and Alerting

The module integrates with CloudWatch for monitoring:

- **Health Checks**: Custom health check script
- **System Metrics**: CPU, memory, network utilization
- **Log Aggregation**: CloudWatch Logs integration
- **Custom Metrics**: NAT-specific performance metrics

## User Data Script Features

The included user data script provides:

### System Configuration
- **IP Forwarding**: Enabled for NAT functionality
- **iptables Rules**: Configured for NAT and security
- **Performance Tuning**: Optimized for NAT workloads
- **Log Rotation**: Automated log management

### Health Monitoring
- **Health Check Script**: Regular connectivity tests
- **CloudWatch Metrics**: Custom metrics publication
- **Alert Integration**: SNS notification support
- **Auto Recovery**: Self-healing capabilities

### Security Hardening
- **Firewall Rules**: Restrictive iptables configuration
- **System Updates**: Automated security patching
- **Access Logging**: Connection tracking and logging
- **Intrusion Detection**: Basic security monitoring

## Troubleshooting

### Common Issues

1. **No Internet Connectivity**
   ```bash
   # Check NAT instance status
   aws ec2 describe-instances --instance-ids i-1234567890abcdef0
   
   # Verify route table
   aws ec2 describe-route-tables --route-table-ids rtb-1234567890abcdef0
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-1234567890abcdef0
   ```

2. **High Latency**
   - Consider upgrading to t3.micro or t3.small
   - Check instance CPU utilization
   - Verify network bandwidth usage

3. **Instance Failures**
   - Enable Auto Scaling Group for automatic recovery
   - Monitor CloudWatch alarms
   - Set up SNS notifications

### Performance Tuning

```bash
# Connect to NAT instance
ssh -i your-key.pem ec2-user@nat-instance-ip

# Check system performance
top
iostat
netstat -i

# Monitor NAT traffic
iptables -t nat -L -n -v
cat /proc/net/dev
```

### Log Analysis

```bash
# NAT instance logs
sudo journalctl -u nat-startup
sudo tail -f /var/log/nat-health.log
sudo tail -f /var/log/nat-traffic.log

# CloudWatch logs
aws logs get-log-events --log-group-name /aws/ec2/nat-instance/myapp-dev
```

## Migration from NAT Gateway

### Step 1: Prepare Migration
```bash
# Document current NAT Gateway configuration
aws ec2 describe-nat-gateways
aws ec2 describe-route-tables
```

### Step 2: Deploy NAT Instance
```hcl
module "nat_instance" {
  source = "./modules/nat-instance"
  # ... configuration
}
```

### Step 3: Update Route Tables
```bash
# The networking module handles route table updates automatically
terraform apply
```

### Step 4: Validate Connectivity
```bash
# Test from private subnet instances
curl -I https://www.google.com
```

### Step 5: Clean Up NAT Gateway
```bash
# Remove NAT Gateway after validation
# This is handled automatically by the networking module
```

## Best Practices

### Development Environment
- Use t3.nano for maximum cost savings
- Disable SSH access if not needed
- Single instance configuration
- Basic monitoring only

### Production Environment
- Use t3.micro or larger for better performance
- Enable Auto Scaling Group for HA
- Restrict SSH access to specific networks
- Comprehensive monitoring and alerting
- Regular backup of configuration

### Security Recommendations
- **Never use 0.0.0.0/0** for admin_cidr_blocks
- **Regularly update** the NAT instance AMI
- **Monitor access logs** for unusual activity
- **Use Session Manager** instead of SSH when possible
- **Enable CloudTrail** for API call logging

## Examples

### Integration with Application Load Balancer

```hcl
# NAT Instance for private subnet connectivity
module "nat_instance" {
  source = "./modules/nat-instance"
  # ... configuration
}

# Application in private subnet using NAT instance
resource "aws_instance" "app_server" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  subnet_id     = module.networking.private_subnet_1_id
  
  # This instance will use NAT instance for internet access
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    # Downloads will go through NAT instance
    yum install -y docker
  EOF
  
  tags = {
    Name = "app-server"
  }
}
```

### Cost Monitoring Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "nat_costs" {
  dashboard_name = "NAT-Cost-Analysis"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", module.nat_instance.nat_instance_id],
            ["AWS/EC2", "NetworkIn", "InstanceId", module.nat_instance.nat_instance_id],
            ["AWS/EC2", "NetworkOut", "InstanceId", module.nat_instance.nat_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "NAT Instance Performance vs Cost"
        }
      }
    ]
  })
}
```

## Dependencies

This module requires:
- **AWS Provider**: >= 5.0
- **VPC**: Must exist before deployment
- **Public Subnet**: Must exist before deployment
- **Key Pair**: Must exist if SSH access is enabled

## Version History

- **v1.0**: Initial release with basic NAT functionality
- **v1.1**: Added Auto Scaling Group support
- **v1.2**: Enhanced security and monitoring
- **v1.3**: Cost optimization improvements
- **v2.0**: Modular architecture and comprehensive documentation