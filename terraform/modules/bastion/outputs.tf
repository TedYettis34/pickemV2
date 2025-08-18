# Bastion Host Module Outputs

output "bastion_instance_id" {
  description = "ID of the bastion host instance"
  value       = aws_instance.bastion.id
}

output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = var.use_elastic_ip ? aws_eip.bastion_eip[0].public_ip : aws_instance.bastion.public_ip
}

output "bastion_private_ip" {
  description = "Private IP address of the bastion host"
  value       = aws_instance.bastion.private_ip
}

output "bastion_security_group_id" {
  description = "Security group ID of the bastion host"
  value       = aws_security_group.bastion_sg.id
}

output "ssh_tunnel_command" {
  description = "SSH tunnel command for database access"
  value = var.bastion_key_pair_name != "" ? format(
    "ssh -i ~/.ssh/%s.pem -L 5432:your-db-endpoint:5432 ec2-user@%s",
    var.bastion_key_pair_name,
    var.use_elastic_ip ? aws_eip.bastion_eip[0].public_ip : aws_instance.bastion.public_ip
  ) : "No key pair specified - use AWS Systems Manager Session Manager instead"
}

output "bastion_cost_analysis" {
  description = "Cost analysis for bastion host"
  value = {
    instance_monthly_cost = "$2.50 (t3.nano) + $0.50 (8GB GP3) = $3.00"
    elastic_ip_monthly_cost = var.use_elastic_ip ? "$3.65" : "$0.00"
    total_monthly_cost = var.use_elastic_ip ? "$6.65" : "$3.00"
    annual_cost = var.use_elastic_ip ? "$79.80" : "$36.00"
    purpose = "Secure database access via SSH tunnel"
  }
}