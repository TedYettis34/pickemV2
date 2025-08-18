# VPC
resource "aws_vpc" "pickem_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "pickem_igw" {
  vpc_id = aws_vpc.pickem_vpc.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-igw"
  })
}

# Public Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.pickem_vpc.id
  cidr_block              = var.public_subnet_1_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-public-subnet-1"
    Type = "Public"
  })
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.pickem_vpc.id
  cidr_block              = var.public_subnet_2_cidr
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-public-subnet-2"
    Type = "Public"
  })
}

# Private Subnets
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.pickem_vpc.id
  cidr_block        = var.private_subnet_1_cidr
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-private-subnet-1"
    Type = "Private"
  })
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.pickem_vpc.id
  cidr_block        = var.private_subnet_2_cidr
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-private-subnet-2"
    Type = "Private"
  })
}

# NAT Gateway (only if not using NAT Instance)
resource "aws_eip" "nat_gateway_eip" {
  count = var.use_nat_instance ? 0 : 1
  
  domain = "vpc"
  depends_on = [aws_internet_gateway.pickem_igw]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-gateway-eip"
  })
}

resource "aws_nat_gateway" "pickem_nat_gw" {
  count = var.use_nat_instance ? 0 : 1
  
  allocation_id = aws_eip.nat_gateway_eip[0].id
  subnet_id     = aws_subnet.public_subnet_1.id
  depends_on    = [aws_internet_gateway.pickem_igw]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-gw"
  })
}

# NAT Instance for cost optimization (replaces NAT Gateway)
# See nat-instance.tf for the NAT instance configuration

# Route Tables
resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.pickem_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.pickem_igw.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-public-rt"
  })
}

resource "aws_route_table" "private_route_table" {
  vpc_id = aws_vpc.pickem_vpc.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-private-rt"
  })
}

# Route for NAT Instance (uses primary network interface)
resource "aws_route" "private_nat_instance" {
  count = var.use_nat_instance ? 1 : 0
  
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat_instance[0].primary_network_interface_id
  
  depends_on = [aws_instance.nat_instance]
}

# Route for NAT Gateway (if not using NAT Instance)
resource "aws_route" "private_nat_gateway" {
  count = var.use_nat_instance ? 0 : 1
  
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.pickem_nat_gw[0].id
}

# Route Table Associations
resource "aws_route_table_association" "public_subnet_1_association" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_route_table.id
}

resource "aws_route_table_association" "public_subnet_2_association" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_route_table.id
}

resource "aws_route_table_association" "private_subnet_1_association" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_route_table.id
}

resource "aws_route_table_association" "private_subnet_2_association" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_route_table.id
}

# Lambda Security Group (for database access)
resource "aws_security_group" "lambda_security_group" {
  name_prefix = "${local.project_name}-${var.environment}-lambda-"
  vpc_id      = aws_vpc.pickem_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-lambda-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}