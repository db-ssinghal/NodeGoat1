# Create a Kubernetes namespace for the NodeGoat staging environment
resource "kubernetes_namespace" "nodegoat_staging" {
  metadata {
    name = var.namespace
    labels ={
        environment = "staging"
        app         = "nodegoat"
        "pod-security.kubernetes.io/enforce" = "baseline"
    }
  }
}