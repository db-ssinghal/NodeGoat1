resource "kubernetes_network_policy" "staging_internal_allow" {
  metadata {
    name      = "allow-internal-staging"
    namespace = "nodegoat-staging"
  }

  spec {
    pod_selector {} # Áp dụng cho TẤT CẢ pod trong namespace

    ingress {
      from {
        pod_selector {} # Cho phép traffic đến từ các pod khác CÙNG namespace
      }
    }

    policy_types = ["Ingress"]
  }
}