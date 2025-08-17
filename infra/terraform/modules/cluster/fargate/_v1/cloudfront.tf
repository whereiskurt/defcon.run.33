data "aws_caller_identity" "current" {
  provider = aws.application
}

data "aws_region" "current" {
  provider = aws.application
}

data "aws_lb_listener" "this" {
  arn      = var.alb_listener
  provider = aws.application
}

data "aws_lb" "this" {
  arn      = var.alb
  provider = aws.application
}

resource "random_id" "rnd" {
  byte_length = 12
}

# resource "aws_route53_zone" "region" {
#   provider = aws.application
#   name     = var.region_zonename
# }

# resource "aws_route53_record" "ns" {
#   provider = aws.application
#   zone_id  = var.zone_map[var.env_zonename].zone_id ### This is the webapp/mqtt.site.tld, region includes use1 etc.
#   name     = var.region_zonename
#   type     = "NS"
#   ttl      = 300
#   records  = aws_route53_zone.region.name_servers
# }

resource "aws_s3_bucket" "cf_bucket" {
  count         = var.use_cloudfront ? 1 : 0
  bucket        = "origin-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  provider      = aws.application
  force_destroy = true ##WILL NUKE BUCKET!
}

resource "aws_iam_user" "cf_user" {
  count    = var.use_cloudfront ? 1 : 0
  name     = "cf-${var.region_zonename}-${random_id.rnd.hex}"
  provider = aws.application
}

resource "aws_iam_access_key" "cf_user_key" {
  count    = var.use_cloudfront ? 1 : 0
  user     = aws_iam_user.cf_user[0].name
  provider = aws.application
}

##############
### CloudFront Distribution 
##############

## Used in CloudFront
resource "aws_acm_certificate" "region" {
  count                     = var.use_cloudfront ? 1 : 0
  provider                  = aws.global-application
  validation_method         = "DNS"
  domain_name               = var.region_zonename
  subject_alternative_names = ["*.${var.region_zonename}", "${var.env_zonename}", "*.${var.env_zonename}"]
}

resource "aws_route53_record" "cert_verify" {
  provider = aws.global-application
  for_each = {
    for dvo in(var.use_cloudfront ? aws_acm_certificate.region[0].domain_validation_options : []) : "${dvo.domain_name}_validation_record" => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = var.zone_map[var.env_zonename].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  allow_overwrite = true
  ttl             = 60
}

resource "aws_acm_certificate_validation" "region_validation" {
  count                   = var.use_cloudfront ? 1 : 0
  provider                = aws.global-application
  certificate_arn         = aws_acm_certificate.region[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_verify : record.fqdn]
}


resource "aws_cloudfront_distribution" "cf_public" {
  count   = var.use_cloudfront ? 1 : 0
  comment = var.region_zonename

  depends_on = [
    aws_s3_bucket.cf_bucket
  ]

  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs[0].bucket_domain_name
    include_cookies = true
    prefix          = "cloudfront-logs/"
  }

  origin {
    domain_name              = aws_s3_bucket.cf_bucket[0].bucket_regional_domain_name
    origin_id                = "s3-public-${aws_s3_bucket.cf_bucket[0].id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.cf_oac[0].id
    origin_path              = "/public"
  }

  origin {
    domain_name              = aws_s3_bucket.cf_bucket[0].bucket_regional_domain_name
    origin_id                = "s3-bare-${aws_s3_bucket.cf_bucket[0].id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.cf_oac[0].id
  }

  origin {
    domain_name = data.aws_lb.this.dns_name
    origin_id   = "lb-${var.region_zonename}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled = true

  default_cache_behavior {
    target_origin_id       = "lb-${var.region_zonename}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "DELETE", "PATCH"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"

    realtime_log_config_arn = var.use_cfd_firehose_logging ? aws_cloudfront_realtime_log_config.cloudfront_realtime_log[0].arn : null
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.cf_bucket_match_public
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "s3-public-${aws_s3_bucket.cf_bucket[0].id}"
      viewer_protocol_policy = "redirect-to-https"

      allowed_methods = ["GET", "HEAD"]
      cached_methods  = ["GET", "HEAD"]
      cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

      realtime_log_config_arn = var.use_cfd_firehose_logging ? aws_cloudfront_realtime_log_config.cloudfront_realtime_log[0].arn : null
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.cf_bucket_match_bare
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "s3-bare-${aws_s3_bucket.cf_bucket[0].id}"
      viewer_protocol_policy = "redirect-to-https"

      allowed_methods = ["GET", "HEAD"]
      cached_methods  = ["GET", "HEAD"]
      cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

      realtime_log_config_arn = var.use_cfd_firehose_logging ? aws_cloudfront_realtime_log_config.cloudfront_realtime_log[0].arn : null
    }
  }

  aliases = [var.region_zonename, var.env_zonename]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.region[0].arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  web_acl_id = var.global_waf_webacl_arn

  provider = aws.global-application
}

resource "aws_cloudfront_origin_access_control" "cf_oac" {
  count                             = var.use_cloudfront ? 1 : 0
  name                              = "oac-s3-cloudfront-${var.region_zonename}"
  description                       = "OAC for accessing S3 from CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
  provider                          = aws.application
}

resource "aws_s3_bucket_policy" "cf_public_policy" {
  count    = var.use_cloudfront ? 1 : 0
  provider = aws.application
  bucket   = aws_s3_bucket.cf_bucket[0].bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.cf_bucket[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "${aws_cloudfront_distribution.cf_public[0].arn}"
          }
        }
      },
      {
        Sid    = "AllowECSAndIAMRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS : [
            "${aws_iam_user.cf_user[0].arn}"
          ]
        },
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:PutObjectAcl"
        ],
        Resource = [
          "${aws_s3_bucket.cf_bucket[0].arn}/*",
          "${aws_s3_bucket.cf_bucket[0].arn}"
        ]
      }
    ]
  })
}

resource "aws_route53_record" "cf_cname_region" {
  count           = var.use_cloudfront ? 1 : 0
  zone_id         = var.zone_map[var.env_zonename].zone_id
  name            = var.region_zonename
  type            = "A"
  allow_overwrite = true
  alias {
    name                   = aws_cloudfront_distribution.cf_public[0].domain_name
    zone_id                = aws_cloudfront_distribution.cf_public[0].hosted_zone_id
    evaluate_target_health = false
  }
  provider = aws.application
}

resource "aws_s3_bucket" "cloudfront_logs" {
  count         = var.use_cloudfront ? 1 : 0
  bucket        = "logs-cf-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  force_destroy = true
  provider      = aws.application
}

resource "aws_s3_bucket_ownership_controls" "cloudfront_logs_ownership" {
  count  = var.use_cloudfront ? 1 : 0
  bucket = aws_s3_bucket.cloudfront_logs[0].id
  rule {
    object_ownership = "ObjectWriter"
  }
  provider = aws.application
}

# NOTE: This is need to allow CloudFront to access the S3 bucket for static assets
resource "aws_s3_bucket_cors_configuration" "cf_bucket_cors" {
  count    = var.use_cloudfront ? 1 : 0
  bucket   = aws_s3_bucket.cf_bucket[0].id
  provider = aws.application

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "POST", "PUT", "DELETE"]
    allowed_origins = ["https://${var.region_zonename}", "https://${var.env_zonename}", "http://localhost:3000"]
    expose_headers  = ["Access-Control-Allow-Origin"]
    max_age_seconds = 3000
  }
}
