variable "app_image" {
  description = "The Docker image for the NodeGoat application"
  type        = string
}
variable "ghcr_pat" {
  description = "GitHub Personal Access Token for GHCR"
  type        = string
  sensitive   = true # Đánh dấu sensitive để tránh hiện token trong log
}
variable "images_to_load" {
  description = "Danh sách các image cần load vào Kind"
  type        = list(string)
  default     = ["mongo:4.4"]
}

variable "cluster_name" {
  description = "Name of the Kind cluster"
  type        = string
  default     = "kind"
}

variable "namespace" {
  type = string
}