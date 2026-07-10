resource "aws_dynamodb_table" "setlists" {
  name         = "${var.project_name}-setlists"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi-userId"
    hash_key        = "userId"
    projection_type = "ALL"
  }
}
