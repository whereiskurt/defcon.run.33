output "ecr_urls" {
  value = [for repo in aws_ecr_repository.repos : { "${repo.name}" : repo.repository_url }]
}

resource "aws_ssm_parameter" "ecr_mosquitto_repo_url" {
  name     = "/${var.region_zonename}/ecr/mqtt/mosquitto/url"
  type     = "String"
  value    = aws_ecr_repository.repos["mosquitto"].repository_url
  provider = aws.application
}
resource "aws_ssm_parameter" "ecr_nginx_repo_url" {
  name     = "/${var.region_zonename}/ecr/mqtt/nginx/url"
  type     = "String"
  value    = aws_ecr_repository.repos["nginx"].repository_url
  provider = aws.application
}

resource "aws_ssm_parameter" "mqtt_user" {
  name     = "/${var.region_zonename}/meshmap/mqtt_username"
  type     = "String"
  value    = "meshmap"
  provider = aws.application
}

resource "aws_ssm_parameter" "mqtt_password" {
  name     = "/${var.region_zonename}/meshmap/mqtt_password"
  type     = "SecureString"
  value    = "meshmap2025!!"
  provider = aws.application
}

resource "aws_ssm_parameter" "mqtt_broker" {
  name     = "/${var.region_zonename}/meshmap/mqtt_broker"
  type     = "String"
  value    = "tcp://localhost:1884"
  provider = aws.application
}

resource "aws_ssm_parameter" "mqtt_channel_name" {
  name     = "/${var.region_zonename}/meshmap/mqtt_channel_name"
  type     = "String"
  value    = "dc.run"
  provider = aws.application
}
resource "aws_ssm_parameter" "mqtt_channel_key" {
  name     = "/${var.region_zonename}/meshmap/mqtt_channel_key"
  type     = "SecureString"
  value    = "Wjt8kzHci9lqdS4tBzSF2VbQd86u6U3nhHaBl7V5TGE="
  provider = aws.application
}