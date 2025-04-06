################
#### Real-time Logging
################
resource "aws_kinesis_stream" "cloudfront_realtime_log_stream" {
  count            = var.use_cfd_firehose_logging ? 1 : 0
  name             = "${var.region_zonename}-${random_id.rnd.hex}"
  shard_count      = 1
  retention_period = 24
  provider         = aws.application
}

resource "aws_iam_role" "cloudfront_realtime_logs_role" {
  count              = var.use_cfd_firehose_logging ? 1 : 0
  name               = "cf-rtlr-${var.region_zonename}-${random_id.rnd.hex}"
  assume_role_policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "cloudfront.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }
  EOF
  provider           = aws.application
}

resource "aws_iam_policy" "cloudfront_realtime_logs_policy" {
  name        = "cf-rtlp-${var.region_zonename}-${random_id.rnd.hex}"
  description = "Policy allowing CloudFront to write real-time logs to Kinesis"
  count       = var.use_cfd_firehose_logging ? 1 : 0
  policy      = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ],
        "Resource": "${aws_kinesis_stream.cloudfront_realtime_log_stream[0].arn}"
      }
    ]
  }
  EOF
  provider    = aws.application
}

resource "aws_iam_role_policy_attachment" "cloudfront_realtime_logs_policy_attach" {
  count      = var.use_cfd_firehose_logging ? 1 : 0
  role       = aws_iam_role.cloudfront_realtime_logs_role[0].name
  policy_arn = aws_iam_policy.cloudfront_realtime_logs_policy[0].arn
  provider   = aws.application
}

resource "aws_cloudfront_realtime_log_config" "cloudfront_realtime_log" {
  count         = var.use_cfd_firehose_logging ? 1 : 0
  name          = "rt-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  sampling_rate = 100

  endpoint {
    stream_type = "Kinesis"
    kinesis_stream_config {
      role_arn   = aws_iam_role.cloudfront_realtime_logs_role[0].arn
      stream_arn = aws_kinesis_stream.cloudfront_realtime_log_stream[0].arn
    }
  }

  fields = [
    "timestamp",
    "c-ip",
    "cs-method",
    "cs-uri-stem",
    "cs-protocol",
    "sc-status",
    "sc-bytes",
  ]
  provider = aws.application
}

resource "aws_s3_bucket" "cloudfront_logs_bucket" {
  count    = var.use_cfd_firehose_logging ? 1 : 0
  bucket   = "logs-rt-cf-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  provider = aws.application
}

resource "aws_iam_role" "firehose_delivery_role" {
  count              = var.use_cfd_firehose_logging ? 1 : 0
  name               = "fdr-${var.region_zonename}-${random_id.rnd.hex}"
  assume_role_policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "firehose.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }
  EOF
  provider           = aws.application
}

resource "aws_iam_policy" "firehose_delivery_policy" {
  count       = var.use_cfd_firehose_logging ? 1 : 0
  name        = "firehose_delivery_policy-${var.region_zonename}-${random_id.rnd.hex}"
  description = "Policy allowing Firehose to write to S3"
  policy      = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:PutObjectTagging",
          "s3:AbortMultipartUpload",
          "s3:ListBucketMultipartUploads",
          "s3:ListBucket"
        ],
        "Resource": [
          "${aws_s3_bucket.cloudfront_logs_bucket[0].arn}",
          "${aws_s3_bucket.cloudfront_logs_bucket[0].arn}/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "kinesis:DescribeStream",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords"
        ],
        "Resource": "${aws_kinesis_stream.cloudfront_realtime_log_stream[0].arn}"
      }
    ]
  }
  EOF
  provider    = aws.application
}

resource "aws_iam_role_policy_attachment" "firehose_delivery_policy_attach" {
  count      = var.use_cfd_firehose_logging ? 1 : 0
  role       = aws_iam_role.firehose_delivery_role[0].name
  policy_arn = aws_iam_policy.firehose_delivery_policy[0].arn
  provider   = aws.application
}

resource "aws_kinesis_firehose_delivery_stream" "cloudfront_logs_delivery_stream" {
  count       = var.use_cfd_firehose_logging ? 1 : 0
  name        = "cfd-${var.region_zonename}-${random_id.rnd.hex}"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_delivery_role[0].arn
    bucket_arn = aws_s3_bucket.cloudfront_logs_bucket[0].arn
  }

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.cloudfront_realtime_log_stream[0].arn
    role_arn           = aws_iam_role.firehose_delivery_role[0].arn
  }

  provider = aws.application
}