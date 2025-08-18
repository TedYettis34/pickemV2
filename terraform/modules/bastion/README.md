# Bastion Host Module

This module creates a secure bastion host for accessing the PickEm database in private subnets.

## What it Creates

- **EC2 Instance**: Cost-optimized t3.nano instance in public subnet
- **Security Group**: SSH access restricted to admin networks only
- **IAM Role**: Permissions to access database credentials from Secrets Manager
- **Elastic IP**: Static IP address for consistent access (optional)
- **User Data**: Pre-installed PostgreSQL client and connection scripts

## Features

- ✅ **Cost-optimized**: ~$3-7/month depending on Elastic IP usage
- ✅ **Secure**: SSH access restricted to private networks only
- ✅ **Pre-configured**: PostgreSQL client and AWS CLI pre-installed
- ✅ **Automated**: Scripts to retrieve DB credentials and connect
- ✅ **Flexible**: Supports both direct connection and SSH tunneling

## Usage

### Option 1: Direct Connection on Bastion
```bash
# SSH to bastion host
ssh -i ~/.ssh/your-key.pem ec2-user@bastion-ip

# Connect to database
./connect-db.sh
```

### Option 2: SSH Tunnel (Recommended)
```bash
# Create SSH tunnel from local machine
ssh -i ~/.ssh/your-key.pem -L 5432:db-endpoint:5432 ec2-user@bastion-ip

# In another terminal, connect locally
psql -h localhost -p 5432 -U pickemadmin -d pickem
```

### Option 3: Run Migrations
```bash
# SSH to bastion with port forwarding
ssh -i ~/.ssh/your-key.pem -L 5432:db-endpoint:5432 ec2-user@bastion-ip

# On local machine, run migrations through tunnel
npm run db:migrate
```

## Security

- **Network Access**: SSH restricted to admin CIDR blocks only
- **No Public Database**: Database remains in private subnets
- **IAM Permissions**: Minimal permissions for Secrets Manager access
- **Encrypted Storage**: Root volume encrypted with EBS encryption
- **IMDSv2**: Instance metadata service v2 enforced

## Cost Analysis

| Component | Monthly Cost | Annual Cost |
|-----------|-------------|-------------|
| t3.nano Instance | $2.50 | $30.00 |
| 8GB GP3 Storage | $0.80 | $9.60 |
| Elastic IP (optional) | $3.65 | $43.80 |
| **Total** | **$3.30-$6.95** | **$39.60-$83.40** |

## Variables

- `bastion_instance_type`: Instance type (default: t3.nano)
- `bastion_key_pair_name`: EC2 key pair for SSH access
- `admin_cidr_blocks`: CIDR blocks allowed SSH access
- `use_elastic_ip`: Whether to assign Elastic IP (default: true)

## Outputs

- `bastion_public_ip`: Public IP for SSH access
- `ssh_tunnel_command`: Ready-to-use SSH tunnel command
- `bastion_cost_analysis`: Cost breakdown and analysis