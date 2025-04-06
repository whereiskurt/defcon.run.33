resource "aws_lb" "nlb_public" {
  count                      = var.use_network_lb ? 1 : 0
  name                       = replace("nlb-${var.env_zonename}", ".", "-")
  internal                   = false
  load_balancer_type         = "network"
  subnets                    = aws_subnet.nlb_public_subnet.*.id
  enable_deletion_protection = var.enable_lb_delete_protection
  provider                   = aws.application
  security_groups            = [aws_security_group.nlb.id]

  access_logs {
    bucket  = aws_s3_bucket.nlb_logs.id
    enabled = true
  }

}

resource "aws_subnet" "nlb_public_subnet" {
  provider                = aws.application
  vpc_id                  = aws_vpc.vpc.id
  count                   = var.use_network_lb ? length(var.nlb_public_subnets_cidr) : 0
  cidr_block              = element(var.nlb_public_subnets_cidr, count.index)
  availability_zone       = element(var.availability_zones, count.index)
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.env_zonename}-nlb-public-${element(var.availability_zones, count.index)}" }
}

resource "aws_route_table_association" "nlb_public" {
  provider       = aws.application
  count          = length(var.nlb_public_subnets_cidr)
  subnet_id      = element(aws_subnet.nlb_public_subnet.*.id, count.index)
  route_table_id = aws_route_table.public.id
}

resource "aws_subnet" "nlb_private_subnet" {
  provider                = aws.application
  vpc_id                  = aws_vpc.vpc.id
  count                   = var.use_network_lb ? length(var.nlb_private_subnets_cidr) : 0
  cidr_block              = element(var.nlb_private_subnets_cidr, count.index)
  availability_zone       = element(var.availability_zones, count.index)
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.env_zonename}-nlb-private-${element(var.availability_zones, count.index)}" }
}

resource "aws_route_table_association" "nlb_private" {
  provider       = aws.application
  count          = length(var.nlb_private_subnets_cidr)
  subnet_id      = element(aws_subnet.nlb_private_subnet.*.id, count.index)
  route_table_id = aws_route_table.private.id
}

resource "aws_s3_bucket" "nlb_logs" {
  provider                = aws.application
  bucket = "nlb-access-logs-${var.env_zonename}"
  force_destroy = true
}
resource "aws_s3_bucket_ownership_controls" "nlb_logs" {
  bucket = aws_s3_bucket.nlb_logs.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
  provider                = aws.application
}
resource "aws_s3_bucket_policy" "nlb_logs_policy" {
  bucket = aws_s3_bucket.nlb_logs.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        },
        Action = "s3:PutObject",
        Resource = "${aws_s3_bucket.nlb_logs.arn}/*",
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow",
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        },
        Action = "s3:GetBucketAcl",
        Resource = aws_s3_bucket.nlb_logs.arn
      }
    ]
  })
  provider                = aws.application
}