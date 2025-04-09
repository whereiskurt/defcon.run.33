resource "aws_flow_log" "vpc_flow_logs" {
  log_destination          = aws_s3_bucket.vpc_flow_logs.arn
  log_destination_type     = "s3"
  traffic_type             = "ALL" # Captures ACCEPT, REJECT, and ALL traffic
  vpc_id                   = aws_vpc.vpc.id
  max_aggregation_interval = 60
  provider                 = aws.application
}

###
resource "aws_s3_bucket" "vpc_flow_logs" {
  bucket        = "logs-vpc-flow-${var.env_zonename}-${random_id.rnd.hex}"
  provider      = aws.application
  force_destroy = true
}

resource "aws_s3_bucket_policy" "vpc_flow_logs_bucket_policy" {
  bucket   = aws_s3_bucket.vpc_flow_logs.id
  provider = aws.application

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        },
        Action   = "s3:PutObject",
        Resource = "arn:aws:s3:::${aws_s3_bucket.vpc_flow_logs.bucket}/*",
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}
