resource "kind_cluster" "nodegoat" {
  name           = var.cluster_name
  node_image     = "kindest/node:v1.27.3" # Bạn có thể chọn version K8s
  wait_for_ready = true

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    node {
      role = "control-plane"
    }
  }
}
#export kubeconfig to local file
resource "local_file" "kubeconfig" {
  content  = kind_cluster.nodegoat.kubeconfig
  filename = "${path.module}/kubeconfig"
}