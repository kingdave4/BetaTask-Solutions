# BetaTask-Solutions

> Full‑stack Todo application with Vue.js + Vite, Node.js + Express + PostgreSQL, and Terraform‑provisioned AKS/ACR on Azure.

---

## 🔗 Links

* **Deep Dive Blog Post:** [Building BetaTask‑Solutions: Why We Chose Kubernetes on Azure](https://www.davidmboli-idie.com/blog/betatask-solution/)

---

## 🛠 Tech Stack

* **Infrastructure as Code:** Terraform (modular)
* **Container Registry:** Azure Container Registry (ACR)
* **Container Orchestration:** Azure Kubernetes Service (AKS)
* **CI/CD:** GitHub Actions (build-and-push & deploy-to-aks)
* **Monitoring:** Prometheus & Grafana
* **Backend:** Node.js, Express.js, PostgreSQL
* **Frontend:** Vue.js, Vite
* **Containerization:** Docker

---

## 🚀 Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/kingdave4/BetaTask-Solutions.git
   cd BetaTask-Solutions/Infra/environments/dev
   ```

2. **Provision Infrastructure**

   ```bash
   terraform init
   terraform plan -var-file="secrets.tfvars"
   terraform apply -var-file="secrets.tfvars" -auto-approve
   ```

   *Pro Tip*: Store state in Azure Blob Storage with soft-delete enabled.

3. **Configure GitHub Secrets** (in repo Settings > Secrets)

   * `AZURE_CREDENTIALS` (Service Principal JSON)
   * `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`

4. **Run CI/CD**

   * Push to `main` branch to trigger **Build & Push Images** workflow.
   * On success, **Deploy to AKS** workflow runs automatically.

---

1. Terraform modules create Resource Group, ACR, and AKS.
2. GitHub Actions builds Docker images and pushes to ACR.
3. A deployment workflow applies Kubernetes manifests to AKS.
4. Prometheus & Grafana monitor cluster and application metrics.
   

## 📁 Project Structure

```
BetaTask-Solutions/
├── backend/                  # Node.js + Express API
│   ├── routes/               # API endpoints
│   ├── models/               # PostgreSQL data models
│   ├── migrations/           # Database migrations
│   └── server.js             # Entry point
│
├── frontend/                 # Vue.js + Vite frontend
│   ├── src/
│   │   ├── components/       # Vue components
│   │   ├── composables/       # Vue composables
│   │   └── services/         # API service calls
│   └── vite.config.js        # Build configuration
│
├── Infra/                    # Terraform IaC
│   ├── environments/
│   │   └── dev/              # Dev environment configs
│   └── modules/              # Reusable Terraform modules
│       ├── resource-group/
│       ├── container-registry/
│       └── aks/
│
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── build-and-push.yml
│       └── deploy-to-aks.yml
│
├── k8s/                      # Kubernetes manifests
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml
│
└── docs/                     # Documentation and diagrams
    └── architecture-diagram.png
```

---

## 🎯 Key Outcomes

* **Zero‑downtime rolling updates** during deployments
* **Seamless scaling** to handle unpredictable load
* **40% faster image builds** through optimized Docker layering

---

## 📝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## ⚖️ License

MIT © David Mboli-Idie
