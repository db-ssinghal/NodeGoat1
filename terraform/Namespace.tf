# Create a Kubernetes namespace for the NodeGoat staging environment
resource "kubernetes_namespace" "nodegoat_staging" {
  metadata {
    name = "nodegoat-staging"
    labels ={
        environment = "staging"
        app         = "nodegoat"
        "pod-security.kubernetes.io/enforce" = "baseline"
    }
  }
}