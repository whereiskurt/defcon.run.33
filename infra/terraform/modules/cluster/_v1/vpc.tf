resource "aws_vpc" "vpc" {
  provider             = aws.application
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.env_zonename}" }
}

# Rest of your resources
resource "aws_subnet" "public_subnet" {
  provider                = aws.application
  vpc_id                  = aws_vpc.vpc.id
  count                   = length(var.public_subnets_cidr)
  cidr_block              = element(var.public_subnets_cidr, count.index)
  availability_zone       = element(var.availability_zones, count.index)
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.env_zonename}-public-${element(var.availability_zones, count.index)}" }
}

resource "aws_subnet" "private_subnet" {
  provider                = aws.application
  vpc_id                  = aws_vpc.vpc.id
  count                   = length(var.private_subnets_cidr)
  cidr_block              = element(var.private_subnets_cidr, count.index)
  availability_zone       = element(var.availability_zones, count.index)
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.env_zonename}-private-${element(var.availability_zones, count.index)}" }
}

resource "aws_route_table" "private" {
  provider = aws.application
  vpc_id   = aws_vpc.vpc.id
  tags     = merge({ Name = "${var.env_zonename}-private" })
}

resource "aws_route_table" "public" {
  provider = aws.application
  vpc_id   = aws_vpc.vpc.id
  tags     = merge({ Name = "${var.env_zonename}-public" })
}

resource "aws_route_table_association" "public" {
  provider       = aws.application
  count          = length(var.public_subnets_cidr)
  subnet_id      = element(aws_subnet.public_subnet.*.id, count.index)
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  provider       = aws.application
  count          = length(var.private_subnets_cidr)
  subnet_id      = element(aws_subnet.private_subnet.*.id, count.index)
  route_table_id = aws_route_table.private.id
}

resource "aws_internet_gateway" "ig" {
  provider = aws.application
  vpc_id   = aws_vpc.vpc.id
  tags     = merge({ Name = "${var.env_zonename}-igw" })
}

resource "aws_route" "public_igw" {
  provider               = aws.application
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.ig.id
}
