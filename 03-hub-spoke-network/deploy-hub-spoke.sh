#!/bin/bash
# Despliegue y configuración de conectividad Hub-and-Spoke (Bloque 3)
REGION="us-east-1"

# 1. Identificar VPCs Hub (10.10.0.0/16) y Spoke (10.20.0.0/16)
HUB_VPC=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=hub-vpc" --query "Vpcs[0].VpcId" --output text --region "$REGION")
SPOKE_VPC=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=spoke-vpc" --query "Vpcs[0].VpcId" --output text --region "$REGION")

# 2. Crear y aceptar VPC Peering
PCX_ID=$(aws ec2 create-vpc-peering-connection \
  --vpc-id "$HUB_VPC" \
  --peer-vpc-id "$SPOKE_VPC" \
  --query "VpcPeeringConnection.VpcPeeringConnectionId" \
  --output text --region "$REGION")

aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id "$PCX_ID" --region "$REGION"

# 3. Configurar rutas bidireccionales entre Hub (10.10.0.0/16) y Spoke (10.20.0.0/16)
HUB_RT=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$HUB_VPC" --query "RouteTables[0].RouteTableId" --output text --region "$REGION")
SPOKE_RT=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$SPOKE_VPC" --query "RouteTables[0].RouteTableId" --output text --region "$REGION")

aws ec2 create-route --route-table-id "$HUB_RT" --destination-cidr-block 10.20.0.0/16 --vpc-peering-connection-id "$PCX_ID" --region "$REGION"
aws ec2 create-route --route-table-id "$SPOKE_RT" --destination-cidr-block 10.10.0.0/16 --vpc-peering-connection-id "$PCX_ID" --region "$REGION"

# 4. Inyectar User-Data en instancia Lift-and-Shift (10.20.1.150) para levantar servicio en puerto 3000
SPOKE_INSTANCE_ID="i-0bfa0e0df159e9fa2"
cat << 'EOF' > /tmp/spoke-ud.sh
#!/bin/bash
cat << 'PYEOF' > /tmp/app.py
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"workload": "lift-and-shift", "status": "ok", "path": self.path}).encode())

HTTPServer(("0.0.0.0", 3000), Handler).serve_forever()
PYEOF
nohup python3 /tmp/app.py > /tmp/app.log 2>&1 &
EOF

aws ec2 stop-instances --instance-ids "$SPOKE_INSTANCE_ID" --region "$REGION"
aws ec2 wait instance-stopped --instance-ids "$SPOKE_INSTANCE_ID" --region "$REGION"
aws ec2 modify-instance-attribute --instance-id "$SPOKE_INSTANCE_ID" --user-data "file:///tmp/spoke-ud.sh" --region "$REGION"
aws ec2 start-instances --instance-ids "$SPOKE_INSTANCE_ID" --region "$REGION"