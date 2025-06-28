#!/bin/bash
# NAT Instance User Data Script
# Configures Amazon Linux 2 instance as NAT with best practices

# Variables from Terraform
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
AWS_REGION="${aws_region}"

# Set hostname
hostnamectl set-hostname "$PROJECT_NAME-$ENVIRONMENT-nat-instance"

# Update system and install required packages
yum update -y
yum install -y htop iftop iotop tcpdump wget curl awscli

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
    "agent": {
        "metrics_collection_interval": 300,
        "run_as_user": "cwagent"
    },
    "metrics": {
        "namespace": "PickEm/NAT",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 300
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 300,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 300,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 300
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 300
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 300
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/ec2/nat-instance/$PROJECT_NAME-$ENVIRONMENT",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/nat-traffic.log",
                        "log_group_name": "/aws/ec2/nat-instance/$PROJECT_NAME-$ENVIRONMENT",
                        "log_stream_name": "{instance_id}/nat-traffic"
                    }
                ]
            }
        }
    }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
sysctl -p

# Configure iptables for NAT
# Flush existing rules
iptables -F
iptables -t nat -F

# Set default policies
iptables -P FORWARD DROP
iptables -P INPUT DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH from anywhere (consider restricting in production)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS from private subnets
iptables -A INPUT -p tcp --dport 80 -s 10.0.3.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -s 10.0.3.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -s 10.0.4.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -s 10.0.4.0/24 -j ACCEPT

# Allow forwarding from private subnets
iptables -A FORWARD -s 10.0.3.0/24 -j ACCEPT
iptables -A FORWARD -s 10.0.4.0/24 -j ACCEPT

# Configure NAT
iptables -t nat -A POSTROUTING -s 10.0.3.0/24 -o eth0 -j MASQUERADE
iptables -t nat -A POSTROUTING -s 10.0.4.0/24 -o eth0 -j MASQUERADE

# Save iptables rules
service iptables save

# Create systemd service to restore iptables on boot
cat > /etc/systemd/system/iptables-restore.service <<EOF
[Unit]
Description=Restore iptables rules
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables-restore /etc/sysconfig/iptables
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable iptables-restore.service

# Create health check script
cat > /usr/local/bin/nat-health-check.sh <<'EOF'
#!/bin/bash
# NAT Instance Health Check Script

LOG_FILE="/var/log/nat-health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log_message() {
    echo "[$TIMESTAMP] $1" >> $LOG_FILE
}

# Check if IP forwarding is enabled
if [ "$(cat /proc/sys/net/ipv4/ip_forward)" != "1" ]; then
    log_message "ERROR: IP forwarding is disabled"
    exit 1
fi

# Check iptables NAT rules
if ! iptables -t nat -L POSTROUTING | grep -q MASQUERADE; then
    log_message "ERROR: NAT rules not found"
    exit 1
fi

# Check internet connectivity
if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    log_message "ERROR: No internet connectivity"
    exit 1
fi

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100.0}')

log_message "Health check passed - CPU: $${CPU_USAGE}%, Memory: $${MEMORY_USAGE}%"

# Log traffic statistics
TRAFFIC_IN=$(cat /proc/net/dev | grep eth0 | awk '{print $2}')
TRAFFIC_OUT=$(cat /proc/net/dev | grep eth0 | awk '{print $10}')
echo "[$TIMESTAMP] Traffic - In: $TRAFFIC_IN bytes, Out: $TRAFFIC_OUT bytes" >> /var/log/nat-traffic.log

exit 0
EOF

chmod +x /usr/local/bin/nat-health-check.sh

# Create cron job for health checks (every 5 minutes)
echo "*/5 * * * * root /usr/local/bin/nat-health-check.sh" >> /etc/crontab

# Performance tuning for NAT workload
cat >> /etc/sysctl.conf <<EOF

# NAT Instance Performance Tuning
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Connection tracking optimizations
net.netfilter.nf_conntrack_max = 65536
net.netfilter.nf_conntrack_tcp_timeout_established = 1200
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 60
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 120

# Security hardening
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
EOF

# Apply sysctl settings
sysctl -p

# Configure log rotation for NAT logs
cat > /etc/logrotate.d/nat-instance <<EOF
/var/log/nat-health.log
/var/log/nat-traffic.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create startup script to ensure NAT configuration persists
cat > /usr/local/bin/nat-startup.sh <<'EOF'
#!/bin/bash
# Ensure NAT configuration is properly set on startup

# Enable IP forwarding if not already enabled
echo 1 > /proc/sys/net/ipv4/ip_forward

# Disable source/destination check via AWS CLI
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --no-source-dest-check --region $(curl -s http://169.254.169.254/latest/meta-data/placement/region) || true

# Log startup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] NAT startup configuration applied" >> /var/log/nat-health.log
EOF

chmod +x /usr/local/bin/nat-startup.sh

# Create systemd service for NAT startup
cat > /etc/systemd/system/nat-startup.service <<EOF
[Unit]
Description=NAT Instance Startup Configuration
After=network.target cloud-init.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/nat-startup.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable nat-startup.service

# Configure automatic security updates
yum install -y yum-cron
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
systemctl enable yum-cron
systemctl start yum-cron

# Create monitoring script for CloudWatch custom metrics
cat > /usr/local/bin/nat-metrics.sh <<'EOF'
#!/bin/bash
# Send custom metrics to CloudWatch

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Get connection count
CONNECTIONS=$(netstat -an | grep :80 | wc -l)
HTTPS_CONNECTIONS=$(netstat -an | grep :443 | wc -l)

# Send metrics to CloudWatch
aws cloudwatch put-metric-data --region $REGION --namespace "PickEm/NAT" --metric-data MetricName=HTTPConnections,Value=$CONNECTIONS,Unit=Count,Dimensions=InstanceId=$INSTANCE_ID
aws cloudwatch put-metric-data --region $REGION --namespace "PickEm/NAT" --metric-data MetricName=HTTPSConnections,Value=$HTTPS_CONNECTIONS,Unit=Count,Dimensions=InstanceId=$INSTANCE_ID

# Get bandwidth utilization
RX_BYTES=$(cat /proc/net/dev | grep eth0 | awk '{print $2}')
TX_BYTES=$(cat /proc/net/dev | grep eth0 | awk '{print $10}')

# Store previous values if they exist
PREV_FILE="/tmp/nat-metrics-prev"
if [ -f "$PREV_FILE" ]; then
    PREV_RX=$(awk 'NR==1' $PREV_FILE)
    PREV_TX=$(awk 'NR==2' $PREV_FILE)
    PREV_TIME=$(awk 'NR==3' $PREV_FILE)
    
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
    
    if [ $TIME_DIFF -gt 0 ]; then
        RX_RATE=$(( (RX_BYTES - PREV_RX) / TIME_DIFF ))
        TX_RATE=$(( (TX_BYTES - PREV_TX) / TIME_DIFF ))
        
        aws cloudwatch put-metric-data --region $REGION --namespace "PickEm/NAT" --metric-data MetricName=NetworkInRate,Value=$RX_RATE,Unit=Bytes/Second,Dimensions=InstanceId=$INSTANCE_ID
        aws cloudwatch put-metric-data --region $REGION --namespace "PickEm/NAT" --metric-data MetricName=NetworkOutRate,Value=$TX_RATE,Unit=Bytes/Second,Dimensions=InstanceId=$INSTANCE_ID
    fi
fi

# Store current values
echo $RX_BYTES > $PREV_FILE
echo $TX_BYTES >> $PREV_FILE
echo $(date +%s) >> $PREV_FILE
EOF

chmod +x /usr/local/bin/nat-metrics.sh

# Add cron job for metrics (every 5 minutes)
echo "*/5 * * * * root /usr/local/bin/nat-metrics.sh" >> /etc/crontab

# Start services
systemctl restart crond
systemctl start nat-startup.service

# Final health check
/usr/local/bin/nat-health-check.sh

# Signal successful completion
echo "NAT Instance initialization completed with exit code: $?" >> /var/log/nat-health.log

echo "NAT Instance configuration completed successfully" >> /var/log/nat-health.log