# Networking Module - VPC, Subnets, Route Tables, and NAT Configuration

# VPC
resource "aws_vpc" "pickem_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "pickem_igw" {
  vpc_id = aws_vpc.pickem_vpc.id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# Public Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.pickem_vpc.id
  cidr_block              = var.public_subnet_1_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-subnet-1"
    Type = "Public"
  })
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.pickem_vpc.id
  cidr_block              = var.public_subnet_2_cidr
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-subnet-2"
    Type = "Public"
  })
}

# Private Subnets
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.pickem_vpc.id
  cidr_block        = var.private_subnet_1_cidr
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-subnet-1"
    Type = "Private"
  })
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.pickem_vpc.id
  cidr_block        = var.private_subnet_2_cidr
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-subnet-2"
    Type = "Private"
  })
}

# Route Tables
resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.pickem_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.pickem_igw.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
  })
}

resource "aws_route_table" "private_route_table" {
  vpc_id = aws_vpc.pickem_vpc.id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-rt"
  })
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

# NAT Gateway (only if not using NAT Instance)
resource "aws_eip" "nat_gateway_eip" {
  count  = var.use_nat_instance ? 0 : 1
  domain = "vpc"

  depends_on = [aws_internet_gateway.pickem_igw]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-gw-eip"
  })
}

resource "aws_nat_gateway" "pickem_nat_gateway" {
  count         = var.use_nat_instance ? 0 : 1
  allocation_id = aws_eip.nat_gateway_eip[0].id
  subnet_id     = aws_subnet.public_subnet_1.id

  depends_on = [aws_internet_gateway.pickem_igw]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-gw"
  })
}

# Route for NAT Instance (uses primary network interface)
resource "aws_route" "private_nat_instance" {
  count = var.use_nat_instance ? 1 : 0
  
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = var.nat_instance_primary_network_interface_id
  
  depends_on = [aws_route_table.private_route_table]
}

# Route for NAT Gateway (if not using NAT Instance)
resource "aws_route" "private_nat_gateway" {
  count = var.use_nat_instance ? 0 : 1
  
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.pickem_nat_gateway[0].id
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}