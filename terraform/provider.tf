terraform {
  required_providers {
    kubernetes = {
        source = "hashicorp/kubernetes"
        version = ">= 2.23.0"
    }

    kind = {
      source  = "tehcyx/kind"
      version = "0.6.0"
    }

    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.0"
    }
  }
}

provider "kubernetes" {
  host                   = kind_cluster.nodegoat.endpoint
  cluster_ca_certificate = kind_cluster.nodegoat.cluster_ca_certificate
  client_certificate     = kind_cluster.nodegoat.client_certificate
  client_key             = kind_cluster.nodegoat.client_key
  # config_path = "~/.kube/config"
}
