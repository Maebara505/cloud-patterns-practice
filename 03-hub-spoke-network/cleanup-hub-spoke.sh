#!/bin/bash
# Limpieza de recursos del Bloque 3 en us-east-1
REGION="us-east-1"

aws ec2 terminate-instances --instance-ids i-02302b756b59dfd81 i-0bfa0e0df159e9fa2 --region "$REGION"
aws ec2 wait instance-terminated --instance-ids i-02302b756b59dfd81 i-0bfa0e0df159e9fa2 --region "$REGION"

for PCX in $(aws ec2 describe-vpc-peering-connections --filters "Name=status-code,Values=active,pending-acceptance" --query "VpcPeeringConnections[*].VpcPeeringConnectionId" --output text --region "$REGION"); do
  aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$PCX" --region "$REGION"
done