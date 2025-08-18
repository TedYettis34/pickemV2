# NAT Instance Module Outputs

output "nat_instance_id" {
  description = "Instance ID of NAT Instance"
  value       = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].id
}

output "nat_instance_ip" {
  description = "Public IP of NAT Instance"
  value       = aws_eip.nat_instance_eip.public_ip
}

output "nat_instance_private_ip" {
  description = "Private IP of NAT Instance"
  value       = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].private_ip
}

output "nat_instance_primary_network_interface_id" {
  description = "Primary network interface ID of NAT Instance"
  value       = var.nat_instance_ha_enabled ? null : aws_instance.nat_instance[0].primary_network_interface_id
}

output "nat_instance_security_group_id" {
  description = "Security group ID of NAT Instance"
  value       = aws_security_group.nat_instance_sg.id
}

output "nat_instance_eip_id" {
  description = "Allocation ID of NAT Instance Elastic IP"
  value       = aws_eip.nat_instance_eip.id
}

output "nat_cost_analysis" {
  description = "Cost comparison between NAT Gateway and NAT Instance"
  value = {
    nat_gateway_monthly_cost = "$45.00 (service) + $12.15 (data) = $57.15"
    nat_instance_monthly_cost = var.nat_instance_type == "t3.nano" ? "$3.70 (instance) + $1.00 (EIP) = $4.70" : var.nat_instance_type == "t3.micro" ? "$7.39 (instance) + $1.00 (EIP) = $8.39" : var.nat_instance_type == "t3.small" ? "$14.79 (instance) + $1.00 (EIP) = $15.79" : "Custom instance type"
    annual_savings = var.nat_instance_type == "t3.nano" ? "$629.40" : var.nat_instance_type == "t3.micro" ? "$585.12" : var.nat_instance_type == "t3.small" ? "$496.32" : "Variable"
    current_configuration = "NAT Instance (${var.nat_instance_type})"
    cost_savings_percentage = var.nat_instance_type == "t3.nano" ? "91.8%" : var.nat_instance_type == "t3.micro" ? "85.3%" : var.nat_instance_type == "t3.small" ? "72.4%" : "Variable"
  }
}