output "kube_config" {
  value = azurerm_kubernetes_cluster.this.kube_config_raw
  sensitive = true
}

output "host" {
  value = azurerm_kubernetes_cluster.this.kube_config.0.host
}

output "principal_id" {
  value = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}



