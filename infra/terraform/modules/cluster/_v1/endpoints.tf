# ## Allows private subnets to access the ECR repositories
resource "aws_vpc_endpoint" "ecr_api" {
  count               = var.use_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application
  tags = merge(
    { Name = "ecr_api" }
  )
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count               = var.use_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application
  tags = merge(
    { Name = "ecr_dkr" }
  )
}

resource "aws_vpc_endpoint" "logs" {
  count               = var.use_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application
  tags = merge(
    { Name = "logs" }
  )
}

resource "aws_vpc_endpoint" "s3_gateway_endpoint" {
  count             = var.use_vpc_endpoints ? 1 : 0
  vpc_id            = aws_vpc.vpc.id
  service_name      = "com.amazonaws.${var.region}.s3" # Replace with your region
  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    aws_route_table.public.id,
    aws_route_table.private.id
  ]
  tags = merge(
    { Name = "s3" }
  )
  policy   = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
EOF
  provider = aws.application

}

# Create VPC Endpoint for SSM API
resource "aws_vpc_endpoint" "ssm" {
  count = var.use_vpc_endpoints ? 1 : 0
  tags = merge(
    { Name = "ssm" }
  )
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application

}

# Create VPC Endpoint for SSM Messages
resource "aws_vpc_endpoint" "ssm_messages" {
  count = var.use_vpc_endpoints ? 1 : 0
  tags = merge(
    { Name = "ssm_messages" }
  )
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application

}

# Create VPC Endpoint for EC2 Messages
resource "aws_vpc_endpoint" "ec2_messages" {
  count = var.use_vpc_endpoints ? 1 : 0
  tags = merge(
    { Name = "ec2_messages" }
  )
  vpc_id              = aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.region}.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.sshhttps.id] # Allow HTTPS (443)
  provider            = aws.application

}
