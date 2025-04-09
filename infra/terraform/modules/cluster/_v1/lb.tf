data "aws_caller_identity" "current" {
  provider = aws.application
}

resource "aws_lb" "lb_public" {
  name                       = replace("alb-${var.env_zonename}", ".", "-")
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.sshhttps.id, aws_security_group.http_only.id]
  subnets                    = aws_subnet.public_subnet.*.id
  enable_deletion_protection = var.enable_lb_delete_protection
  provider                   = aws.application
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_log_bucket.id
    prefix  = "access"
    enabled = true
  }
  connection_logs {
    bucket  = aws_s3_bucket.alb_log_bucket.id
    prefix  = "connection"
    enabled = true
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.lb_public.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.env_cert.arn
  provider          = aws.application
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "404 Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_s3_bucket" "alb_log_bucket" {
  bucket        = "logs-alb-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  provider      = aws.application
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_log_bucket_encryption" {
  bucket = aws_s3_bucket.alb_log_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
  provider = aws.application
}

//NOTE: Each region has it's own account where the access logs come from
//https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
resource "aws_s3_bucket_policy" "alb_log_bucket_bucket_policy" {
  bucket   = aws_s3_bucket.alb_log_bucket.id
  provider = aws.application

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : {
          "AWS" : [
            "arn:aws:iam::797873946194:root",
            "arn:aws:iam::127311923021:root",
            "arn:aws:iam::985666609251:root"
          ]
        },
        "Action" : "s3:PutObject",
        "Resource" : [
          "arn:aws:s3:::${aws_s3_bucket.alb_log_bucket.bucket}/access/AWSLogs/${data.aws_caller_identity.current.account_id}/*",
          "arn:aws:s3:::${aws_s3_bucket.alb_log_bucket.bucket}/connection/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        ]
      }
    ]
  })
}
