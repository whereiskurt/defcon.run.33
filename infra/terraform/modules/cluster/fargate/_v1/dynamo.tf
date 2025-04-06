resource "aws_iam_user" "this" {
  name     = "dyna-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  provider = aws.application
}

resource "aws_iam_access_key" "this" {
  user     = aws_iam_user.this.name
  provider = aws.application
}

resource "aws_iam_user_policy_attachment" "this" {
  user       = aws_iam_user.this.name
  policy_arn = aws_iam_policy.this.arn
  provider   = aws.application
}

locals {
  dyna_arn = "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}"

  dyna_resources = flatten([
    for table_name in var.dynamo_tables : [
      "${local.dyna_arn}:table/${table_name}",
      "${local.dyna_arn}:table/${table_name}/index/*"
    ]
  ])
}

resource "aws_dynamodb_table" "dynamo_tables" {
  provider     = aws.application
  for_each     = toset(var.dynamo_tables)
  name         = each.key
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  attribute {
    name = "PK"
    type = "S" # String type
  }
  tags = {
    Name = each.key
  }
}

resource "aws_iam_policy" "this" {
  name     = "dyna-${replace(var.region_zonename, ".", "-")}-${random_id.rnd.hex}"
  provider = aws.application

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "DynamoDBAccess",
        "Effect" : "Allow",
        "Action" : [
          "dynamodb:Batch*",
          "dynamodb:Describe*",
          "dynamodb:List*",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Get*",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:Update*",
          "dynamodb:Create*"
        ],
        "Resource" : local.dyna_resources
      }
    ]
  })
}
