
resource "aws_s3_bucket" "ecs_bucket" {
  bucket = replace("logs-ecs-common-${var.env_zonename}-${random_id.rnd.hex}", ".", "-")
  provider = aws.application
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "ecs_bucket_ownership" {
  bucket   = aws_s3_bucket.ecs_bucket.id
  provider = aws.application
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_policy" "ecs_bucket_policy" {
  bucket   = aws_s3_bucket.ecs_bucket.id
  provider = aws.application
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_role.arn
        }
        Resource = [
          aws_s3_bucket.ecs_bucket.arn,
          "${aws_s3_bucket.ecs_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_ssm_parameter" "ecs_common_bucket_name" {
  type     = "String"
  name     = "/${var.region_zonename}/ecs/s3/common_bucket_name"
  description = "A common bucket for ECS tasks to write to"
  value    = aws_s3_bucket.ecs_bucket.bucket
  provider = aws.application
}
resource "aws_ssm_parameter" "ecs_common_bucket_region" {
  type     = "String"
  name     = "/${var.region_zonename}/ecs/s3/common_bucket_region"
  description = "The region of the common bucket for ECS tasks"
  value    = var.region
  provider = aws.application
}