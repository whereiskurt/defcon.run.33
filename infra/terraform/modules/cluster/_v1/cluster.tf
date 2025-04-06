resource "random_id" "rnd" {
  byte_length = 12
}

resource "aws_service_discovery_private_dns_namespace" "namespace" {
  name        = "${replace(var.account_zonename, ".", "-")}.local"
  description = "Private DNS namespace for ${var.account_zonename}"
  vpc         = aws_vpc.vpc.id
  provider    = aws.application
}

resource "aws_ecs_cluster" "ecs" {
  name     = replace("${var.env_zonename}", ".", "-")
  provider = aws.application
  setting {
    name  = "containerInsights"
    value = var.use_container_insights ? "enabled" : "disabled"
  }
}
resource "aws_iam_role" "ecs_role" {
  name     = replace("ecs-role-${var.env_zonename}", ".", "-")
  provider = aws.application
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : {
      "Effect" : "Allow",
      "Principal" : { "Service" : "ecs-tasks.amazonaws.com" },
      "Action" : "sts:AssumeRole"
  } })
}
resource "aws_iam_role_policy" "ecs_role_policy" {
  name     = replace("ecs-policy-${var.env_zonename}", ".", "-")
  role     = aws_iam_role.ecs_role.id
  provider = aws.application

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["servicediscovery:*", "ssm:*", "s3:*", "ecr:*", "logs:*", "cloudwatch:*", "cloudwatchlogs:*", "cloudtrail:*", "kms:*", "secretsmanager:*", ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
resource "aws_iam_role_policy_attachment" "ecs_task_ecspolicy" {
  role       = aws_iam_role.ecs_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  provider   = aws.application
}
resource "aws_iam_role_policy_attachment" "ecs_task_logpolicy" {
  role       = aws_iam_role.ecs_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchFullAccessV2"
  provider   = aws.application
}