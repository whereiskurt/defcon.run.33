data "aws_caller_identity" "current" {
  provider = aws.application
}

data "aws_region" "current" {
  provider = aws.application
}

locals {
  parameter_arn = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter"
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
        nginx : replace("nginx-${var.env_zonename}", ".", "-")
        app : "app"
      },
      image : {
        nginx : "${aws_ecr_repository.repos["nginx"].repository_url}:${var.repo_versions["nginx"]}"
        app : "${aws_ecr_repository.repos["app"].repository_url}:${var.repo_versions["app"]}"
      },
      log_region : {
        nginx : data.aws_region.current.name
        app : data.aws_region.current.name
      },
      healthcheck_url : {
        nginx : "https://localhost/hello"
        app : "http://localhost:3000"
      },
      app_url : {
        nginx : "https://${var.env_zonename}"   ##HTTPS proxying in from load balancer
        app : "http://${var.env_zonename}:3000" ##HTTP proxying from nginx
      },

      p_email : "${local.parameter_arn}/${var.region_label}.email.${var.account_zonename}",
      p_app : "${local.parameter_arn}/${var.region_zonename}",
      p_cluster : "${local.parameter_arn}/${var.region_label}.${var.account_zonename}",
      p_account : "${local.parameter_arn}/${var.account_zonename}",

      cpu : {
        nginx : 256
        app : 256
        strapi : 256
      },
      memory : {
        nginx : 512
        app : 512
        strapi : 512
      },
      memoryReservation : {
        nginx : 256
        app : 256
        strapi : 256
      }
    }
  )
  provider = aws.application
}

resource "aws_lb_target_group" "service" {
  name        = replace("${var.env_zonename}", ".", "-")
  port        = 443
  protocol    = "HTTPS"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/hello"
    protocol            = "HTTPS"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }
  provider = aws.application
}

resource "aws_lb_listener_rule" "this" {
  listener_arn = var.alb_listener

  condition {
    host_header {
      values = ["${var.env_zonename}", "*.${var.env_zonename}"]
    }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }
  provider = aws.application
}

resource "aws_service_discovery_service" "service_discovery" {
  name = "nodecms"
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

resource "aws_ecs_service" "this" {
  name                 = replace("${var.env_zonename}", ".", "-")
  cluster              = var.cluster_id
  task_definition      = aws_ecs_task_definition.service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true

  network_configuration {
    subnets          = var.subnets
    security_groups  = var.security_groups
    assign_public_ip = var.use_public_subnets
  }

  service_registries {
    registry_arn = aws_service_discovery_service.service_discovery.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = replace("nginx-${var.env_zonename}", ".", "-")
    container_port   = 443
  }
  provider = aws.application

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