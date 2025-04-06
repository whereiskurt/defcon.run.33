# NAT Gateway needs an EIP
resource "aws_eip" "nat" {
  count    = var.use_nat_gateway ? 1 : 0
  provider = aws.application
  domain   = "vpc"
}

# NAT Gateway
resource "aws_nat_gateway" "nat" {
  count         = var.use_nat_gateway ? 1 : 0
  provider      = aws.application
  allocation_id = aws_eip.nat[0].id
  subnet_id     = element(aws_subnet.public_subnet.*.id, 0) # Example uses the first public subnet
}

# Routes for NAT Gateway in private route table
resource "aws_route" "private_nat_gateway" {
  count                  = var.use_nat_gateway ? 1 : 0
  provider               = aws.application
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat[0].id
}