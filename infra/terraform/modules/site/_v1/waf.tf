resource "aws_wafv2_ip_set" "allow_list" {
  count              = var.use_global_waf ? 1 : 0
  name               = "global-allowlist-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  scope              = "CLOUDFRONT"
  description        = "Allow list of IPs that bypass rate limiting"
  ip_address_version = "IPV4"
  addresses = [
  ]
  provider = aws.global-application
}

resource "aws_wafv2_web_acl" "this" {
  count    = var.use_global_waf ? 1 : 0
  name     = "global-webacl-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  scope    = "CLOUDFRONT" # Must be CLOUDFRONT for CloudFront distributions
  provider = aws.global-application

  description = "An advanced WAF WebACL using AWS Managed Rules"
  default_action {
    allow {
      custom_request_handling {
        insert_header {
          ##From console notes: "AWS WAF prefixes your custom header names with x-amzn-waf- when it inserts them.""
          name  = "pristine"
          value = "1"
        }
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "global-webacl-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  }

  rule {
    name     = "AllowListBypass"
    priority = 10
    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.allow_list[0].arn
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowListBypass"
    }
  }

  rule {
    name     = "AllowAuthHeaderOnStrapiUpload"
    priority =11

    action {
      allow {}
    }

    statement {
      and_statement {
        # 1. Check if Authorization header is present (any value)
        statement {
          or_statement {
            # 1. Check if Authorization header is present (any value)
            statement {
              size_constraint_statement {
                field_to_match {
                  single_header {
                    name = "authorization"
                  }
                }
                comparison_operator = "GT"
                size                = 0
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }

            # 2. Check if "express.sid" cookie is present in the Cookie header
            statement {
              byte_match_statement {
                field_to_match {
                  single_header {
                    name = "cookie"
                  }
                }
                positional_constraint = "CONTAINS"
                search_string         = "express.sid="
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }
          }
        }

        # 2. Match requests where the Host header contains "strapi" OR "etherpad"
        statement {
          or_statement {
            statement {
              byte_match_statement {
                field_to_match {
                  single_header {
                    name = "host"
                  }
                }
                positional_constraint = "CONTAINS"
                search_string         = "strapi"
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                field_to_match {
                  single_header {
                    name = "host"
                  }
                }
                positional_constraint = "CONTAINS"
                search_string         = "etherpad"
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }
          }
        }

        statement {
          or_statement {
            # 1. Match requests where the URI contains "/upload"
            statement {
              byte_match_statement {
                field_to_match {
                  uri_path {}
                }
                positional_constraint = "CONTAINS"
                search_string         = "/upload"
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }

            # 2. Match requests where the URI contains "/socket.io/"
            statement {
              byte_match_statement {
                field_to_match {
                  uri_path {}
                }
                positional_constraint = "CONTAINS"
                search_string         = "/socket.io/"
                text_transformation {
                  priority = 1
                  type     = "NONE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "allow-auth-header-on-strapi-upload"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 20
    override_action {
      none {} ##Could set back to none{} to not override the block rules.
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        ##Never block missing UserAgent Headers...
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "NoUserAgent_HEADER"
        }

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "EC2MetaDataSSRF"
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRuleSet"
    }
  }

  # Add AWS Managed Rules: SQLi (SQL Injection) Rule Set
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 30
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSSQLiRuleSet"
    }
  }

  # Add AWS Managed Rules: Known Bad Inputs Rule Set
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 40
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSKnownBadInputs"
    }
  }

  rule {
    name     = "LimitRequestsByIP"
    priority = 50
    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000 # 1000 requests in a 5-minute period
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
    }
  }

  rule {
    name     = "BlockCountries"
    priority = 60
    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["IR", "UA", "CU"]
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockCountries"
    }
  }

  custom_response_body {
    key          = "default-block-response"
    content_type = "APPLICATION_JSON"
    content = jsonencode({
      message = "Request not acceptable. Your IP has been temporarily blocked due to exceeding the rate limit."
    })
  }
}

################################################################################
### Use S3 bucket to collect logs, no CloudWatch
################################################################################
resource "aws_iam_role" "firehose_delivery_role" {
  count = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0
  name  = "fdr-${replace(var.account_zonename, ".", "-")}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "firehose.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  provider = aws.global-application

}

resource "aws_iam_policy" "firehose_delivery_policy" {
  count = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0
  name  = "fdp-${replace(var.account_zonename, ".", "-")}"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:ListBucket"
        ],
        Resource = [
          "${aws_s3_bucket.firehose_bucket[0].arn}",
          "${aws_s3_bucket.firehose_bucket[0].arn}/*"
        ]
      }
    ]
  })
  provider = aws.global-application

}

resource "aws_iam_role_policy_attachment" "firehose_policy_attachment" {
  count = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0

  role       = aws_iam_role.firehose_delivery_role[0].name
  policy_arn = aws_iam_policy.firehose_delivery_policy[0].arn
  provider   = aws.global-application

}

resource "aws_s3_bucket" "firehose_bucket" {
  count         = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0
  bucket        = "logs-rt-waf-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  force_destroy = true ##WILL NUKE BUCKET!
  provider      = aws.global-application
}

resource "aws_kinesis_firehose_delivery_stream" "waf_logs" {
  count = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0

  ##NOTE: The name /has/ to start with aws-waf-logs!
  name        = "aws-waf-logs-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  destination = "extended_s3"
  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_delivery_role[0].arn
    bucket_arn = aws_s3_bucket.firehose_bucket[0].arn
    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose_log_group[0].name
      log_stream_name = aws_cloudwatch_log_stream.firehose_log_stream[0].name
    }
  }
  provider = aws.global-application
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  count                   = var.use_global_waf && var.use_global_waf_realtime ? 1 : 0
  log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf_logs[0].arn]
  resource_arn            = aws_wafv2_web_acl.this[0].arn
  provider                = aws.global-application
}

resource "aws_cloudwatch_log_group" "firehose_log_group" {
  count             = var.use_global_waf ? 1 : 0
  name              = "/aws/kinesisfirehose/waf-logs/${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  retention_in_days = 14
  provider          = aws.global-application
}

resource "aws_cloudwatch_log_stream" "firehose_log_stream" {
  count          = var.use_global_waf ? 1 : 0
  name           = "waf-logs-stream-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  log_group_name = aws_cloudwatch_log_group.firehose_log_group[0].name
  provider       = aws.global-application
}

################################################################################
### Use CloudWatch logging
################################################################################
resource "aws_iam_role" "waf_logging_role" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0

  name = "AWSWAFLoggingRole-${replace(var.account_zonename, ".", "-")}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "waf.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
  provider = aws.global-application
}

resource "aws_iam_policy" "waf_logging_policy" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0

  name        = "AWSWAFLoggingPolicy-${replace(var.account_zonename, ".", "-")}"
  description = "Allows WAF to write logs to CloudWatch Logs"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = aws_cloudwatch_log_group.waf_logs[0].arn
    }]
  })
  provider = aws.global-application
}

resource "aws_iam_role_policy_attachment" "waf_logging_attachment" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0

  role       = aws_iam_role.waf_logging_role[0].name
  policy_arn = aws_iam_policy.waf_logging_policy[0].arn
  provider   = aws.global-application
}

resource "aws_cloudwatch_log_group" "waf_logs" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0

  name              = "aws-waf-logs-${replace(var.account_zonename, ".", "-")}-${random_id.rnd.hex}"
  retention_in_days = 30  # Adjust retention as needed
  provider          = aws.global-application
}

resource "aws_cloudwatch_log_resource_policy" "waf_logs_policy" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0

  policy_name = "AWSWAFLogsPolicy-${replace(var.account_zonename, ".", "-")}"
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "waf.amazonaws.com"
      }
      Action   = "logs:PutLogEvents"
      Resource = aws_cloudwatch_log_group.waf_logs[0].arn
    }]
  })
  provider = aws.global-application
}

resource "aws_wafv2_web_acl_logging_configuration" "waf_logs" {
  count = var.use_global_waf && !var.use_global_waf_realtime ? 1 : 0
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs[0].arn]
  resource_arn            = aws_wafv2_web_acl.this[0].arn  # Ensure correct reference to WAF ACL
  provider = aws.global-application
}