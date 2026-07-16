variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "setnote"
}

variable "domain_name" {
  description = "Custom domain for the app"
  type        = string
  default     = "setnote.yu-web.site"
}

variable "hosted_zone_name" {
  description = "Route 53 hosted zone name"
  type        = string
  default     = "yu-web.site"
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude Vision image parsing"
  type        = string
  sensitive   = true
  default     = ""
}
