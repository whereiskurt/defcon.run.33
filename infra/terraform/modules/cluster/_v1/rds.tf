resource "aws_db_subnet_group" "postgres" {
  for_each   = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name       = replace("${each.value.db_dbname}-${var.env_zonename}", ".", "-")
  subnet_ids = aws_subnet.private_subnet.*.id
  provider   = aws.application
}

resource "random_id" "rds_password" {
  byte_length = 12
  count       = var.use_rds_serverless ? length(var.rds_serverless) : 0
}

resource "aws_rds_cluster" "aurora_serverless" {
  for_each                     = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  cluster_identifier           = replace("${each.value.db_dbname}-${var.env_zonename}-${random_id.rnd.hex}", ".", "-")
  engine_mode                  = "provisioned"
  engine                       = "aurora-postgresql"
  engine_version               = each.value.engine_version
  database_name                = each.value.db_dbname
  master_username              = each.value.db_username
  master_password              = random_id.rds_password[each.key].hex
  port                         = each.value.db_port
  db_subnet_group_name         = aws_db_subnet_group.postgres[each.key].name
  vpc_security_group_ids       = [aws_security_group.postgres.id, aws_security_group.http_only.id, aws_security_group.sshhttps.id]
  backup_retention_period      = 7
  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "Mon:03:00-Mon:04:00"
  skip_final_snapshot          = true

  ##This is what triggers a password change right away.
  apply_immediately = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.0
    max_capacity = 1.0
  }

  lifecycle {
    //This allows us to use something uuidgen to generate a new password, without terraform trying to change it
    //Whe it's time to roll-passwords we do it outside of this execution.
    //ignore_changes = [master_password]
  }

  provider = aws.application
}

resource "aws_rds_cluster_instance" "instance" {
  for_each           = var.use_rds_serverless ? aws_rds_cluster.aurora_serverless : {}
  instance_class     = "db.serverless"
  identifier         = replace("${each.value.database_name}-${var.env_zonename}-${random_id.rnd.hex}", ".", "-")
  cluster_identifier = each.value.cluster_identifier
  engine             = each.value.engine
  engine_version     = each.value.engine_version
  provider           = aws.application
}

resource "aws_ssm_parameter" "db_names" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_name"
  type     = "String"
  value    = each.value.db_dbname
  provider = aws.application
}

resource "aws_ssm_parameter" "db_usernames" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_username"
  type     = "String"
  value    = each.value.db_username
  provider = aws.application
}

resource "aws_ssm_parameter" "db_passwords" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_password"
  type     = "SecureString"
  value    = random_id.rds_password[each.key].hex
  provider = aws.application
}

resource "aws_ssm_parameter" "db_endpoints_writer" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_endpoint_writer"
  type     = "String"
  value    = aws_rds_cluster.aurora_serverless[each.key].endpoint
  provider = aws.application
}

resource "aws_ssm_parameter" "db_endpoints_reader" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_endpoint_reader"
  type     = "String"
  value    = aws_rds_cluster.aurora_serverless[each.key].reader_endpoint
  provider = aws.application
}

resource "aws_ssm_parameter" "db_ports" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}
  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_port"
  type     = "String"
  value    = each.value.db_port
  provider = aws.application
}

resource "aws_ssm_parameter" "db_engines" {
  for_each = var.use_rds_serverless ? { for idx, db in var.rds_serverless : idx => db } : {}

  name     = "/${var.region_zonename}/rds/${each.value.db_dbname}/db_engine"
  type     = "String"
  value    = each.value.db_engine
  provider = aws.application
}