resource "null_resource" "kind_load_images" {
  # Kích hoạt lại nếu image thay đổi
  triggers = {
    app_image = var.app_image
  }

  # Load image mongo mặc định và image app mới build
  provisioner "local-exec" {
    command = <<EOT
    #   kind load docker-image mongo:4.4 --name ${var.cluster_name}
      kind load docker-image ${var.app_image} --name ${var.cluster_name}
    EOT
  }

  # Phải đợi Namespace có sẵn (hoặc các resource cơ bản khác)
  depends_on = [kubernetes_namespace.nodegoat_staging]
}