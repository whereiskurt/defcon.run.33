locals {
  dyna_arn = "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}"
}

resource "aws_dynamodb_table" "this" {
  name = replace("nextauth-${var.region_zonename}", ".", "-")

  billing_mode = "PAY_PER_REQUEST" # Alternatively, ON_DEMAND, see https://aws.amazon.com/dynamodb/pricing/
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    hash_key        = "GSI1PK"
    name            = "GSI1"
    projection_type = "ALL"
    range_key       = "GSI1SK"
  }

  ttl {
    attribute_name = "expires"
    enabled        = true
  }
  provider = aws.application
}

resource "aws_iam_user" "this" {
  name     = replace("nextauth-${var.region_zonename}", ".", "-")
  provider = aws.application
}

resource "aws_iam_access_key" "this" {
  user     = aws_iam_user.this.name
  provider = aws.application
}

resource "aws_iam_user_policy_attachment" "this" {
  user       = aws_iam_user.this.name
  policy_arn = aws_iam_policy.this.arn
  provider = aws.application
}

resource "aws_iam_policy" "this" {
  name     = replace("nextauth-${var.region_zonename}", ".", "-")
  provider = aws.application

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "DynamoDBAccess",
        "Effect" : "Allow",
        "Action" : [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Describe*",
          "dynamodb:List*",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ],
        "Resource" : [
          "${local.dyna_arn}:table/${aws_dynamodb_table.this.name}",
          "${local.dyna_arn}:table/${aws_dynamodb_table.this.name}/index/GSI1",
          "${local.dyna_arn}:table/*",
          "${local.dyna_arn}:table/*/index/*",
        ]
      }
    ]
  })
}

resource "aws_ssm_parameter" "auth_table" {
  name     = "/${var.region_zonename}/next-auth/dbname"
  type     = "String"
  value    = aws_dynamodb_table.this.name
  provider = aws.application
}
resource "aws_ssm_parameter" "access_key" {
  name     = "/${var.region_zonename}/next-auth/access_key"
  type     = "String"
  value    = aws_iam_access_key.this.id
  provider = aws.application
}
resource "aws_ssm_parameter" "secret_key" {
  name     = "/${var.region_zonename}/next-auth/secret_key"
  type     = "SecureString"
  value    = aws_iam_access_key.this.secret
  provider = aws.application
}
