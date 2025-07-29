## BetaTask-Solutions

> Full‑stack Todo application with Vue.js + Vite, Node.js + Express + PostgreSQL, and Terraform‑provisioned AKS/ACR on Azure.

---

### 🔗 Links

* **Deep Dive Blog Post:** [Building BetaTask‑Solutions: Why We Chose Kubernetes on Azure](https://www.davidmboli-idie.com/blog/betatask-solution/)

---

### 🛠 Tech Stack

* **Infrastructure as Code:** Terraform (modular)
* **Container Registry:** Azure Container Registry (ACR)
* **Container Orchestration:** Azure Kubernetes Service (AKS)
* **CI/CD:** GitHub Actions (build-and-push & deploy-to-aks)
* **Monitoring:** Prometheus & Grafana
* **Backend:** Node.js, Express.js, PostgreSQL
* **Frontend:** Vue.js, Vite
* **Containerization:** Docker

---

### 🚀 Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/kingdave4/BetaTask-Solutions.git
   cd BetaTask-Solutions/Infra/environments/dev
   ```


2. **Create your own terraform.tfvars file**
   
   ```bash
   touch terraform.tfvars
   ```
   Open terraform.tfvars and fill in your own values:

   ```tf
   subscription_id     = "Your Subscription ID"
   resource_group_name = "rg-todo-dev"
   acr_name            = "todocrdev123"

   location     = "eastus2"
   cluster_name = "todo-aks-dev"
   vm_size      = "Standard_B2s"
   tags = {
     environment = "dev"
     project     = "ToDoList"
     owner       = "Your Name(s)"
   }
   ```


4. **Provision Infrastructure**

   ```bash
   terraform init
   terraform plan -var-file="terraform.tfvars"
   terraform apply -var-file="terraform.tfvars" -auto-approve
   ```

   *Pro Tip*: Store state in Azure Blob Storage with soft-delete enabled.

5. **Configure GitHub Secrets** (in repo Settings > Secrets)

   * `AZURE_CREDENTIALS` (Service Principal JSON)
   * `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`

6. **Run CI/CD**

   * Push to `main` branch to trigger **Build & Push Images** workflow.
   * On success, **Deploy to AKS** workflow runs automatically.

---

1. Terraform modules create Resource Group, ACR, and AKS.
2. GitHub Actions builds Docker images and pushes to ACR.
3. A deployment workflow applies Kubernetes manifests to AKS.
4. Prometheus & Grafana monitor cluster and application metrics.
   

### 📁 Project Structure

```
ToDoList-Solutions/
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── build-and-push.yml
│       └── deploy-to-aks.yml
├── frontend/                    # Vue 3 frontend
│   ├── src/
│   │   ├── components/         # Vue components
│   │   │   ├── AddTodoModal.vue
│   │   │   ├── CalendarPage.vue
│   │   │   ├── DashboardPage.vue
│   │   │   ├── Notes.vue
│   │   │   ├── NotificationCenter.vue
│   │   │   ├── ReminderModal.vue
│   │   │   ├── TagsManager.vue
│   │   │   └── TodoItem.vue
│   │   ├── composables/        # Vue composables
│   │   │   ├── useAuth.js
│   │   │   └── useNotifications.js
│   │   ├── services/           # API services
│   │   └── firebase.js         # Firebase configuration
├── backend/                     # Node.js backend (optional)
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   └── reminders.js
│   ├── middleware/             # Authentication middleware
│   ├── tests/                  # Test files
│   └── server.js               # Entry point
├── Infra/                      # Terraform infrastructure
│   ├── environments/dev/       # Development environment
│   ├   ├── backend.tf                  # Backend configuation - Tfstate file configuration 
│   ├   ├── main.tf                  # Module main reusable file
│   ├   ├── provider.tf                # Reusable Terraform modules
│   ├   ├── variable.tf                 # Variable file
│   ├   ├── secrets.tfvars                 # default variable file
│   └── modules/                # Terraform modules
│   │   ├── resource-group/       # Azure resource group for all the services
│   │   ├── aks/       # Azure Kubernetes terraformm configuration file
│   │   ├── container-registry/         # Azure container registry to store the images
├── firestore.rules             # Firestore security rules
├── docker-compose.yml          # Multi-service setup
├── *-deployment.yaml           # Kubernetes deployments
└── *-service.yaml              # Kubernetes services
```

### 🎯 Key Outcomes

* **Zero‑downtime rolling updates** during deployments
* **Seamless scaling** to handle unpredictable load
* **40% faster image builds** through optimized Docker layering

---

### 📝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

### ⚖️ License

MIT © David Mboli-Idie
