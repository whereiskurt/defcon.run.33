resource "aws_ecr_repository" "repos" {
  for_each             = toset(var.repos)
  name                 = "${each.value}.${var.env_zonename}"
  provider             = aws.application
  force_delete         = true
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

}