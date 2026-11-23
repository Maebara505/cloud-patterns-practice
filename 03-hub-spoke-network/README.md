# 03 - Arquitectura Hub-and-Spoke, VPC Peering, Bastion Host y Lift-and-Shift

## Topología Implementada (`us-east-1`)

- **Hub VPC (`10.10.0.0/16`):** Subred pública `10.10.1.0/24` con salida a Internet vía IGW.
  - **Bastion Host (`i-02302b756b59dfd81`):** IP privada `10.10.1.242`.
- **Spoke VPC (`10.20.0.0/16`):** Subred aislada `10.20.1.0/24` para cargas migradas.
  - **Instancia Lift-and-Shift (`i-0bfa0e0df159e9fa2`):** IP privada `10.20.1.150` escuchando en TCP `3000`.
- **VPC Peering (`active`):** Enlace privado entre `10.10.0.0/16` y `10.20.0.0/16` con rutas cruzadas en ambas tablas de enrutamiento y reglas de Security Group habilitadas para TCP `3000` e `ICMP` desde el Hub.

## Validación de Conectividad (desde Bastion `10.10.1.242` hacia Spoke `10.20.1.150`)

```bash
ping -c 3 10.20.1.150
curl -i --max-time 5 "[http://10.20.1.150:3000/health](http://10.20.1.150:3000/health)"
# Respuesta: HTTP/1.0 200 OK -> {"workload": "lift-and-shift", "status": "ok", "path": "/health"}

