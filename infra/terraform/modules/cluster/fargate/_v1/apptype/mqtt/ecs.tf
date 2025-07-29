data "aws_caller_identity" "current" {
  provider = aws.application
}

data "aws_region" "current" {
  provider = aws.application
}

data "aws_lb" "nlb" {
  arn      = var.nlb
  provider = aws.application
}

locals {
  parameter_arn = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter"

  region_label_map = {
    use1 = "us-east-1"
    cac1 = "ca-central-1"
    usw2 = "us-west-2"
  }
}

resource "aws_service_discovery_service" "service_discovery" {
  name = "mqtt"
  dns_config {
    namespace_id = var.service_namespace
    dns_records {
      type = "A"
      ttl  = 10
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
  provider = aws.application
}

resource "aws_ecs_task_definition" "service" {
  family                   = replace("${var.env_zonename}", ".", "-")
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = var.task_execution_role_arn
  cpu                      = 512
  memory                   = 1024
  network_mode             = "awsvpc"

  container_definitions = templatefile(
    "${path.module}/taskdef/taskdef.json.tftpl", {
      safedomain = replace(var.env_zonename, ".", "-")
      name : {
        mosquitto : replace("mosquitto-${var.env_zonename}", ".", "-"),
        nginx : replace("nginx-${var.env_zonename}", ".", "-"),
        grpc : replace("grpc-${var.env_zonename}", ".", "-"),
        ghosts : replace("ghosts-${var.env_zonename}", ".", "-")

      },
      image : {
        mosquitto : "${aws_ecr_repository.repos["mosquitto"].repository_url}:${var.repo_versions["mosquitto"]}",
        nginx : "${aws_ecr_repository.repos["nginx"].repository_url}:${var.repo_versions["nginx"]}",
        grpc : "${aws_ecr_repository.repos["grpc"].repository_url}:${var.repo_versions["grpc"]}",
        ghosts : "${aws_ecr_repository.repos["grpc"].repository_url}:${var.repo_versions["grpc"]}"
      },
      log_region : {
        mosquitto : data.aws_region.current.name,
        nginx : data.aws_region.current.name,
        grpc : data.aws_region.current.name,
        ghosts : data.aws_region.current.name
      },
      app_url : {
        nginx : "https://${var.env_zonename}",
        mosquitto : "${var.env_zonename}:1883"
      },

      p_email : "${local.parameter_arn}/${var.region_label}.email.${var.account_zonename}",
      p_app : "${local.parameter_arn}/${var.region_zonename}",
      p_cluster : "${local.parameter_arn}/${var.region_label}.${var.account_zonename}",

      cpu : {
        mosquitto : 128,
        nginx : 128,
        grpc : 128,
        ghosts : 128
      },
      memory : {
        mosquitto : 256,
        nginx : 256,
        grpc : 256,
        ghosts : 256
      },
      memoryReservation : {
        mosquitto : 256,
        nginx : 256,
        grpc : 256,
        ghosts : 256
      }
    }
  )
  provider = aws.application
}

resource "aws_ecs_service" "this" {
  name                 = replace("${var.env_zonename}", ".", "-")
  cluster              = var.cluster_id
  task_definition      = aws_ecs_task_definition.service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true

  depends_on = [
    aws_ecs_task_definition.service,
    aws_lb_target_group.mqtt_nginx_target,
    aws_lb_target_group.mosquitto_target,
    aws_lb_target_group.mosquitto_websocket_target
  ]

  network_configuration {
    subnets          = var.nlb_subnet
    security_groups  = var.security_groups
    assign_public_ip = var.use_public_subnets
  }
  service_registries {
    registry_arn   = aws_service_discovery_service.service_discovery.arn
    container_name = replace("mosquitto-${var.env_zonename}", ".", "-")
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.mqtt_nginx_target.arn
    container_name   = replace("nginx-${var.env_zonename}", ".", "-")
    container_port   = 443
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.mosquitto_target.arn
    container_name   = replace("grpc-${var.env_zonename}", ".", "-")
    container_port   = 1883
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.mosquitto_websocket_target.arn
    container_name   = replace("mosquitto-${var.env_zonename}", ".", "-")
    container_port   = 9001
  }
  lifecycle {
    ignore_changes = [
      task_definition,
    ]
  }
  deployment_circuit_breaker {
    enable   = true
    rollback = false
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
  health_check_grace_period_seconds  = 300

  provider = aws.application
}


## This little ditty is curtiousy of terraform not being able to wait for ACM certs to be issued natively (300sec is 5mins)
resource "null_resource" "wait_for_acm_cert" {
  triggers = {
    cert_arn = aws_acm_certificate.env_certs[var.app_type].arn
  }

  provisioner "local-exec" {
    command     = <<EOT
    for i in {1..30}; do
      status=$(aws acm describe-certificate --certificate-arn ${aws_acm_certificate.env_certs[var.app_type].arn} --query 'Certificate.Status' --output text --region ${local.region_label_map[var.region_label]})
      echo "Certificate status: $status"
      if [ "$status" = "ISSUED" ]; then
        exit 0
      fi
      sleep 10
    done
    echo "Timed out waiting for certificate to be ISSUED"
    exit 1
    EOT
    interpreter = ["/bin/bash", "-c"]
  }
}

resource "aws_lb_target_group" "mosquitto_target" {
  name              = replace("mosquitto-${var.env_zonename}", ".", "-")
  port              = 1883
  protocol          = "TCP"
  vpc_id            = var.vpc_id
  target_type       = "ip"
  provider          = aws.application
  proxy_protocol_v2 = true
}

resource "aws_lb_target_group" "mqtt_nginx_target" {
  name        = replace("nginx-${var.env_zonename}", ".", "-")
  port        = 443
  protocol    = "TLS"
  vpc_id      = var.vpc_id
  target_type = "ip"
  provider    = aws.application
}

## As per this policy: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
resource "aws_lb_listener" "mqtt_nginx_tls" {
  load_balancer_arn = data.aws_lb.nlb.arn
  port              = "443"
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-0-2021-06"
  certificate_arn   = aws_acm_certificate.env_certs[var.app_type].arn
  provider          = aws.application
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mqtt_nginx_target.arn
  }
  depends_on = [
    data.aws_lb.nlb,
    aws_acm_certificate.env_certs,
    null_resource.wait_for_acm_cert
  ]
}

resource "aws_lb_listener" "mosquitto_tcp" {
  load_balancer_arn = data.aws_lb.nlb.arn
  port              = 1883
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mosquitto_target.arn
  }
  provider = aws.application
  depends_on = [
    data.aws_lb.nlb,
    aws_acm_certificate.env_certs,
    null_resource.wait_for_acm_cert
  ]
}

resource "aws_lb_listener" "mosquitto_tls" {
  load_balancer_arn = data.aws_lb.nlb.arn
  port              = "8883"
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-0-2021-06"
  certificate_arn   = aws_acm_certificate.env_certs[var.app_type].arn
  provider          = aws.application

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mosquitto_target.arn
  }
  depends_on = [
    # Reference to the data source that provides the NLB
    data.aws_lb.nlb,
    aws_acm_certificate.env_certs,
    null_resource.wait_for_acm_cert
  ]
}


resource "aws_lb_target_group" "mosquitto_websocket_target" {
  name        = replace("mosquitto-wss-${var.env_zonename}", ".", "-")
  port        = 9001
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  provider    = aws.application
}

resource "aws_lb_listener" "mosquitto_websocket_tls" {
  load_balancer_arn = data.aws_lb.nlb.arn
  port              = "8443"
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-0-2021-06"
  certificate_arn   = aws_acm_certificate.env_certs[var.app_type].arn
  provider          = aws.application

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mosquitto_websocket_target.arn
  }

  depends_on = [
    # Reference to the data source that provides the NLB
    data.aws_lb.nlb,
    aws_acm_certificate.env_certs,
    null_resource.wait_for_acm_cert
  ]
}

resource "aws_appautoscaling_target" "ecs_service" {
  count              = var.use_alarms ? 1 : 0
  depends_on         = [aws_ecs_service.this]
  service_namespace  = "ecs"
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.min_capacity
  max_capacity       = var.max_capacity
  provider           = aws.application
}

resource "aws_appautoscaling_policy" "scale_out" {
  count              = var.use_alarms ? 1 : 0
  name               = "scale-out-${aws_ecs_service.this.name}"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.ecs_service[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service[0].scalable_dimension
  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 120
    metric_aggregation_type = "Maximum"
    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = 1
    }
  }
  provider = aws.application
}

resource "aws_appautoscaling_policy" "scale_in" {
  count              = var.use_alarms ? 1 : 0
  name               = "scale-in-${aws_ecs_service.this.name}"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.ecs_service[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service[0].scalable_dimension
  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 120
    metric_aggregation_type = "Maximum"
    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
  provider = aws.application
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count               = var.use_alarms ? 1 : 0
  alarm_name          = "high-cpu-${aws_ecs_service.this.name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Trigger scale-out if CPU > 75%"
  actions_enabled     = true
  alarm_actions       = [aws_appautoscaling_policy.scale_out[0].arn]
  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = aws_ecs_service.this.name
  }
  provider = aws.application
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  count               = var.use_alarms ? 1 : 0
  alarm_name          = "low-cpu-${aws_ecs_service.this.name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 25
  alarm_description   = "Trigger scale-in if CPU < 25%"
  actions_enabled     = true
  alarm_actions       = [aws_appautoscaling_policy.scale_in[0].arn]
  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = aws_ecs_service.this.name
  }
  provider = aws.application
}
