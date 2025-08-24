resource "random_id" "rnd" {
  byte_length = 12
}

resource "aws_s3_bucket" "mqtt_logging" {
  bucket = replace("logs-${var.region_zonename}-${random_id.rnd.hex}", ".", "-")
  provider = aws.application
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "mqtt_logging_bucket_ownership" {
  bucket   = aws_s3_bucket.mqtt_logging.id
  provider = aws.application
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}
resource "aws_s3_bucket_policy" "mqtt_logging_policy" {
  bucket   = aws_s3_bucket.mqtt_logging.id
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
          AWS = [
            aws_iam_role.task_role.arn
          ]
        }
        Resource = [
          aws_s3_bucket.mqtt_logging.arn,
          "${aws_s3_bucket.mqtt_logging.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_ssm_parameter" "mqtt_logging_bucket_name" {
  type     = "String"
  name     = "/${var.region_zonename}/mqtt/s3/logging_bucket_name"
  description = "A mqtt logging for ECS tasks to write to"
  value    = aws_s3_bucket.mqtt_logging.bucket
  provider = aws.application
}
resource "aws_ssm_parameter" "mqtt_logging_bucket_region" {
  type     = "String"
  name     = "/${var.region_zonename}/mqtt/s3/logging_bucket_region"
  description = "The region of the mqtt logging for ECS tasks"
  value    = data.aws_region.current.name
  provider = aws.application
}