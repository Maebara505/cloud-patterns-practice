# Cloud Architecture Patterns & AWS Networking Practice (`cloud-patterns-practice`)

This repository documents the development, deployment, and validation of three hands-on labs covering cloud-native resilience patterns, containerized/serverless architectures, and isolated VPC networking on **Amazon Web Services (AWS)** (`us-east-1`).

---

## Repository Structure

    cloud-patterns-practice/
    ├── 01-resilience-patterns/       # Local resilience & Circuit Breaker client/service implementation (VS Code)
    ├── 02-containers-serverless/     # Docker, Nginx, AWS Lambda & ECS Fargate + ALB deployment
    ├── 03-hub-spoke-network/         # Hub-and-Spoke VPC topology, VPC Peering, Bastion Host & Lift-and-Shift
    ├── evidences/                    # Execution logs, test outputs, and architecture verification screenshots
    └── README.md                     # Project overview, detailed practice breakdown, and reproducibility notes

---
---

## Architecture Diagrams

### Practice 02 — Resilient Containers & Serverless Architecture (AWS)

    [Client / Tester]
           |
           +---> [API Gateway] ---> [AWS Lambda (handler.js)]
           |
           +---> [Application Load Balancer (resilient-alb)]
                        |
                        v
                 [ECS Fargate Cluster]
                 +---------------------------------------+
                 |  resilient-service (Port 80/8080)     |
                 |  [Nginx Proxy] -> [Resilient Client]  |
                 |                   (Circuit Breaker)   |
                 +---------------------------------------+

### Practice 03 — Hub-and-Spoke VPC Peering & Lift-and-Shift (us-east-1)

    +-----------------------------------+         +-----------------------------------+
    |        HUB VPC (10.10.0.0/16)     |         |       SPOKE VPC (10.20.0.0/16)    |
    |                                   |         |                                   |
    |  +-----------------------------+  |   VPC   |  +-----------------------------+  |
    |  | Public Subnet (10.10.1.0/24)|  | Peering |  | Isolated Subnet (10.20.1/24)|  |
    |  |                             |  | active  |  |                             |  |
    |  |  [Bastion Host]             +==+=========+=>|  [Lift-and-Shift EC2]       |  |
    |  |  IP: 10.10.1.242            |  |  TCP    |  |  IP: 10.20.1.150:3000       |  |
    |  +--------------+--------------+  |  3000   |  |  (lift-and-shift-app.py)    |  |
    |                 |                 |  ICMP   |  +-----------------------------+  |
    |           [Internet GW]           |         |                                   |
    +-----------------+-----------------+         +-----------------------------------+
                      |
                 (Internet)
                 
---

## Detailed Breakdown of Practices

### 01 — Resilience Patterns & Circuit Breaker (`01-resilience-patterns/`)
* **Objective:** Implement and validate fault-tolerance mechanisms in a local development environment (**Visual Studio Code**) prior to cloud deployment.
* **What was done:**
  * **Simulated Unstable Backend (`unstable-service.js`):** Built an HTTP service capable of operating under three controlled modes: nominal (`mode=ok`), high latency (`mode=slow`), and forced failures (`mode=fail`).
  * **Resilient HTTP Client (`resilient-client.js`):** Implemented timeout management, retry logic, and a **Circuit Breaker** state machine (`CLOSED` -> `OPEN` -> `HALF-OPEN`) to trip requests when the downstream service degrades, preventing cascading failures.
  * **Local Validation:** Executed test runs and captured execution logs (`01-resilience-client-logs.txt` and `01-resilience-test-output.txt` inside `evidences/`).

---

### 02 — Containers & Serverless Deployment (`02-containers-serverless/`)
* **Objective:** Package the resilient application into containers and deploy scalable cloud workloads behind managed HTTP entry points on AWS.
* **What was done:**
  * **Local Container Orchestration:** Built the container image using `Dockerfile`, configured multi-container orchestration via `docker-compose.yml`, and set up reverse-proxy routing (`/api/call`) with `nginx.conf`.
  * **Serverless Execution (AWS Lambda & API Gateway):** Implemented `handler.js` to process stateless HTTP requests without provisioned servers (`mode=ok`), verifying JSON payloads and execution timestamps.
  * **Container Deployment on AWS (Amazon ECR, ECS Fargate & ALB):**
    * Pushed the Docker image to **Amazon ECR** (`resilient-app`).
    * Deployed `resilient-service` on **ECS Fargate** (`running: 1` / `desired: 1`) behind an **Application Load Balancer** (`resilient-alb`).
    * Validated healthy traffic (`200 OK` on `mode=ok`), latency behavior (`mode=slow`), and Circuit Breaker state transitions (`OPEN` on `mode=fail`).

---

### 03 — Hub-and-Spoke Topology, VPC Peering, Bastion Host & Lift-and-Shift (`03-hub-spoke-network/`)
* **Objective:** Establish private, segmented network communication between isolated VPCs on AWS without exposing internal workloads directly to the public Internet.
* **What was done:**
  * **Segmented Network Architecture (`10.10.0.0/16` & `10.20.0.0/16`):**
    * **Hub VPC (`10.10.0.0/16`):** Central network with a public subnet (`10.10.1.0/24`) and Internet Gateway egress, hosting the **Bastion Host** (`10.10.1.242`) as an administrative and diagnostic jump box.
    * **Spoke VPC (`10.20.0.0/16`):** Isolated network (`10.20.1.0/24`) hosting a **Lift-and-Shift** EC2 workload (`10.20.1.150`) running an HTTP health service on TCP port `3000` (`lift-and-shift-app.py`).
  * **Private Interconnectivity via VPC Peering & Routing:**
    * Created and accepted an `active` **VPC Peering** connection linking both networks.
    * Configured bidirectional routes across route tables (`10.10.0.0/16` <-> `10.20.0.0/16`) and restrictive Security Group rules allowing TCP `3000` and `ICMP` traffic exclusively from the Hub CIDR.
  * **Troubleshooting, Bootstrapping & End-to-End Validation:**
    * Updated the Spoke EC2 instance `user-data` to automatically launch the HTTP health listener on `0.0.0.0:3000`.
    * Verified network reachability (`ping -c 3 10.20.1.150` with `0% packet loss`) and service availability (`curl -i http://10.20.1.150:3000/health` returning `200 OK`) directly from the **Bastion Host**.

---

## Execution Environment & Reproducibility (AWS CloudShell)

While Practices 01 and 02 began in a local **Visual Studio Code** environment, **AWS CloudShell** was used as the primary cloud execution interface for provisioning, troubleshooting, and tearing down the AWS infrastructure—particularly in **Practice 03 (Hub-and-Spoke & VPC Peering)**—for the following reasons:

* **Pre-authenticated & Zero-Setup Environment:** AWS CloudShell comes pre-configured with the AWS CLI and inherits temporary IAM credentials directly from the active AWS Academy Learner Lab session, eliminating the need to export temporary access keys to a local workstation.
* **Direct Cloud-Side Execution & Diagnostics:** Running CLI commands directly inside `us-east-1` minimized network latency during VPC route alignment, Security Group inspection, EC2 `user-data` updates, and end-to-end connectivity tests (`ping` and `curl` from `10.10.1.242` to `10.20.1.150:3000`).
* **Reproducibility & Cost Hygiene via Shell Scripts:** Although the cloud resources were provisioned interactively via CLI, all imperative commands were consolidated into version-controlled scripts (`deploy-hub-spoke.sh` and `cleanup-hub-spoke.sh`) to ensure full reproducibility and clean teardown of EC2 instances, VPC Peerings, Load Balancers, and ECS tasks after capturing verification evidence.

---

## Verification & Evidences (`evidences/`)

All execution logs, CLI outputs, and verification screenshots for every stage are stored in [`evidences/`](./evidences):
* **Practice 01:** Local resilient client logs and test outputs (`01-resilience-client-logs.txt`, `01-resilience-test-output.txt`).
* **Practice 02:** Local container responses, AWS Lambda execution outputs, and ECS Fargate + ALB load/failure tests (`Circuit Breaker OPEN`).
* **Practice 03:** Active VPC Peering status, cross-VPC route tables, Spoke Security Group rules, and Bastion-to-Spoke `ping` / `curl` (`200 OK`) checks.
