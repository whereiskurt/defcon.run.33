output "ecr_urls" {
  value = [for repo in aws_ecr_repository.repos : { "${repo.name}" : repo.repository_url }]
}

resource "aws_ssm_parameter" "ecr_nginx_repo_url" {
  name     = "/${var.region_zonename}/ecr/nodecms/nginx/url"
  type     = "String"
  value    = aws_ecr_repository.repos["nginx"].repository_url
  provider = aws.application
}

resource "aws_ssm_parameter" "ecr_app_repo_url" {
  name     = "/${var.region_zonename}/ecr/nodecms/app/url"
  type     = "String"
  value    = aws_ecr_repository.repos["app"].repository_url
  provider = aws.application
}