data "aws_lb" "nlb" {
  count    = var.app_type == "mqtt" ? 1 : 0
  arn      = var.nlb
  provider = aws.application
}

resource "aws_route53_record" "app_record" {
  count   = var.is_primary_deployment && var.app_type == "mqtt" ? 1 : 0
  zone_id = var.zone_map[var.env_zonename].zone_id
  name    = var.env_zonename
  type    = "A"

  alias {
    name                   = data.aws_lb.nlb[0].dns_name
    zone_id                = data.aws_lb.nlb[0].zone_id
    evaluate_target_health = true
  }
  allow_overwrite = true
  provider        = aws.global-application
}

resource "aws_route53_record" "app_region_record" {
  count   = var.is_primary_deployment && var.app_type == "mqtt" ? 1 : 0
  zone_id = var.zone_map[var.env_zonename].zone_id
  name    = var.region_zonename
  type    = "A"

  alias {
    name                   = data.aws_lb.nlb[0].dns_name
    zone_id                = data.aws_lb.nlb[0].zone_id
    evaluate_target_health = true
  }
  allow_overwrite = true
  provider        = aws.global-application
}

// TODO: Consider moving this into the apptype ! :) 
resource "aws_route53_record" "nextjs_primary_record" {
  count   = var.is_primary_deployment && (var.app_type == "nextjs" || var.app_type == "strapi" || var.app_type == "etherpad"  ) ? 1 : 0
  zone_id = var.zone_map[var.env_zonename].zone_id
  name    = var.env_zonename
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.cf_public[0].domain_name
    zone_id                = aws_cloudfront_distribution.cf_public[0].hosted_zone_id
    evaluate_target_health = false
  }

  allow_overwrite = true
  provider        = aws.global-application
}
