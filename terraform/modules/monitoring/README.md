# Monitoring Module

This module provides comprehensive monitoring and alerting for the PickEm application infrastructure, including NAT instance monitoring, database monitoring, and automated recovery capabilities.

## Architecture

- **CloudWatch Dashboards**: Visual monitoring for NAT instance performance
- **CloudWatch Alarms**: Proactive alerting for critical metrics
- **SNS Topics**: Notification system for alerts and incidents
- **Lambda Recovery**: Automated recovery for NAT instance failures
- **Log Management**: Centralized logging with retention policies
- **Cost-Optimized**: Essential monitoring without expensive features

## Features

### NAT Instance Monitoring
- CPU, memory, and network utilization tracking
- Health check monitoring with custom metrics
- Automated failure detection and recovery
- Performance dashboards and alerting

### Database Monitoring
- RDS CPU utilization monitoring
- Connection count tracking
- Cost-optimized monitoring (no Performance Insights)

### Automated Recovery
- NAT instance restart on failure
- Route table recovery for network issues
- SNS notifications for all recovery actions

## Usage

### Basic Monitoring Setup

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  project_name              = "myapp"
  environment              = "dev"
  aws_region               = "us-east-1"
  use_nat_instance         = true
  nat_instance_id          = module.nat_instance.nat_instance_id
  database_instance_id     = module.database.database_instance_id
  private_route_table_id   = module.networking.private_route_table_id
  kms_key_id               = aws_kms_key.app_key.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Basic alerting
  alert_email              = ""  # No email alerts
  enable_automated_recovery = false
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### Production Monitoring with Alerts

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  project_name              = "myapp"
  environment              = "prod"
  aws_region               = "us-east-1"
  use_nat_instance         = true
  nat_instance_id          = module.nat_instance.nat_instance_id
  database_instance_id     = module.database.database_instance_id
  private_route_table_id   = module.networking.private_route_table_id
  kms_key_id               = aws_kms_key.app_key.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Production alerting
  alert_email              = "admin@company.com"
  enable_automated_recovery = true
  
  common_tags = local.prod_tags
}
```

### Cost-Optimized Monitoring

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  project_name              = "myapp"
  environment              = "dev"
  aws_region               = "us-east-1"
  use_nat_instance         = false  # No NAT instance monitoring
  nat_instance_id          = null
  database_instance_id     = module.database.database_instance_id
  kms_key_id               = aws_kms_key.app_key.id
  kms_key_arn              = aws_kms_key.app_key.arn
  
  # Minimal monitoring
  alert_email              = ""
  enable_automated_recovery = false
  
  common_tags = local.cost_optimized_tags
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| aws_region | AWS region | `string` | n/a | yes |
| use_nat_instance | Whether NAT instance monitoring is enabled | `bool` | `false` | no |
| nat_instance_id | ID of the NAT instance to monitor | `string` | `null` | no |
| database_instance_id | ID of the database instance to monitor | `string` | n/a | yes |
| private_route_table_id | ID of the private route table | `string` | `null` | no |
| kms_key_id | KMS key ID for encryption | `string` | n/a | yes |
| kms_key_arn | KMS key ARN for encryption | `string` | n/a | yes |
| alert_email | Email address for alerts | `string` | `""` | no |
| enable_automated_recovery | Enable automated recovery Lambda | `bool` | `false` | no |
| common_tags | Common tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| nat_instance_cloudwatch_log_group | CloudWatch log group for NAT instance |
| nat_instance_sns_topic | SNS topic for NAT instance alerts |
| nat_instance_dashboard_url | URL for NAT instance dashboard |
| general_alerts_topic | SNS topic for general alerts |
| nat_recovery_lambda_function | NAT recovery Lambda function name |

## Monitoring Features

### CloudWatch Dashboards

The module creates interactive dashboards showing:

#### NAT Instance Dashboard
- **Performance Metrics**: CPU, memory, network utilization
- **Network Traffic**: Inbound/outbound data transfer
- **Health Status**: Custom health check metrics
- **Cost Analysis**: Performance vs cost comparison

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", "InstanceId", "i-1234567890abcdef0"],
          [".", "NetworkIn", ".", "."],
          [".", "NetworkOut", ".", "."]
        ],
        "title": "NAT Instance Performance",
        "period": 300
      }
    }
  ]
}
```

### CloudWatch Alarms

#### NAT Instance Alarms
- **High Memory Usage**: >90% for 10 minutes
- **High Disk Usage**: >85% for 10 minutes
- **High Network Usage**: >100MB/min for 15 minutes
- **Health Check Failure**: Custom health check fails

#### Database Alarms
- **High CPU Usage**: >90% for 15 minutes
- **Connection Limit**: Near max connections

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| NAT CPU | 70% | 90% | SNS Alert |
| NAT Memory | 80% | 90% | SNS Alert |
| NAT Disk | 75% | 85% | SNS Alert |
| DB CPU | 80% | 90% | SNS Alert |
| Health Check | 1 failure | 2 failures | Auto Recovery |

## Automated Recovery

### NAT Instance Recovery Lambda

The recovery Lambda provides:

#### Failure Detection
- Instance state monitoring
- Health check failure detection
- Network connectivity validation

#### Recovery Actions
1. **Instance Restart**: Reboot unresponsive instance
2. **Route Repair**: Fix broken route table entries
3. **Network Recovery**: Restore network interface configuration

#### Notification System
- **Success Notifications**: Recovery completed successfully
- **Failure Notifications**: Manual intervention required
- **Status Updates**: Real-time recovery progress

### Recovery Lambda Code Structure

```python
def lambda_handler(event, context):
    """Main recovery handler"""
    instance_id = os.environ['INSTANCE_ID']
    route_table_id = os.environ['ROUTE_TABLE_ID']
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Check instance health
    health_status = check_instance_health(instance_id)
    
    if health_status['needs_recovery']:
        # Attempt recovery
        recovery_result = recover_nat_instance(instance_id, route_table_id)
        
        # Send notification
        send_notification(sns_topic_arn, instance_id, recovery_result)
    
    return {'statusCode': 200, 'body': 'Recovery check completed'}
```

## Log Management

### CloudWatch Log Groups

#### NAT Instance Logs
- **Log Group**: `/aws/ec2/nat-instance/project-env`
- **Retention**: 7 days (cost-optimized)
- **Encryption**: KMS encrypted
- **Content**: Health checks, traffic logs, system events

#### Lambda Logs
- **Log Group**: `/aws/lambda/nat-recovery`
- **Retention**: 14 days
- **Content**: Recovery attempts, error messages

### Log Analysis Queries

```bash
# Search for health check failures
aws logs filter-log-events \
  --log-group-name "/aws/ec2/nat-instance/myapp-dev" \
  --filter-pattern "HEALTH_CHECK_FAILED"

# Monitor recovery attempts
aws logs filter-log-events \
  --log-group-name "/aws/lambda/nat-recovery" \
  --filter-pattern "Recovery"
```

## Cost Optimization

### Monitoring Costs
- **CloudWatch Dashboards**: $3/dashboard/month
- **CloudWatch Alarms**: $0.10/alarm/month
- **Log Storage**: $0.50/GB/month
- **Lambda Executions**: $0.20/1M requests

### Cost-Saving Features
- **Disabled Performance Insights**: Saves ~$7/month
- **Basic Monitoring**: 5-minute intervals (free)
- **Short Log Retention**: 7 days vs 30+ days
- **Conditional Resources**: Only create what's needed

### Monthly Cost Breakdown (Typical)
```
Basic Monitoring Setup:
- 5 CloudWatch Alarms: $0.50
- 1 Dashboard: $3.00
- Log Storage (1GB): $0.50
- Lambda (100 executions): $0.00
Total: ~$4.00/month
```

## SNS Notification Examples

### Email Alert Format

```
Subject: NAT Instance Alert: High CPU Usage - myapp-dev

NAT Instance Alert

Instance ID: i-1234567890abcdef0
Alarm: High CPU Usage
Current Value: 95%
Threshold: 90%
Duration: 15 minutes
Time: 2024-01-15 10:30:00 UTC

The NAT instance is experiencing high CPU usage. This may impact
network performance for private subnet resources.

Recommended Actions:
1. Check current network traffic
2. Consider upgrading instance type
3. Review application workloads

Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=myapp-dev-nat-instance-dashboard
```

### Recovery Notification

```
Subject: NAT Instance Recovery Successful - myapp-dev

NAT Instance Recovery Report

Instance ID: i-1234567890abcdef0
Action: Instance Restart
Status: SUCCESS
Time: 2024-01-15 10:35:00 UTC
Duration: 30 seconds

The NAT instance has been successfully recovered and is now
functioning normally. Network connectivity has been restored
for all private subnet resources.

Next Steps:
- Monitor performance for next 30 minutes
- Verify application connectivity
- Check for any related issues
```

## Integration Examples

### Application Health Check

```python
import boto3
import requests

def check_nat_connectivity():
    """Check if NAT instance is working from private subnet"""
    try:
        # Test internet connectivity through NAT
        response = requests.get(
            'https://httpbin.org/ip',
            timeout=10
        )
        
        if response.status_code == 200:
            # Publish custom metric
            cloudwatch = boto3.client('cloudwatch')
            cloudwatch.put_metric_data(
                Namespace='Custom/Application',
                MetricData=[
                    {
                        'MetricName': 'NATConnectivity',
                        'Value': 1,
                        'Unit': 'Count'
                    }
                ]
            )
            return True
        else:
            return False
    except:
        # Publish failure metric
        cloudwatch = boto3.client('cloudwatch')
        cloudwatch.put_metric_data(
            Namespace='Custom/Application',
            MetricData=[
                {
                    'MetricName': 'NATConnectivity',
                    'Value': 0,
                    'Unit': 'Count'
                }
            ]
        )
        return False
```

### Custom Dashboard Widget

```hcl
resource "aws_cloudwatch_dashboard" "application_health" {
  dashboard_name = "${var.project_name}-${var.environment}-app-health"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["Custom/Application", "NATConnectivity"],
            ["AWS/EC2", "CPUUtilization", "InstanceId", module.nat_instance.nat_instance_id]
          ]
          title = "Application Connectivity vs NAT Performance"
          period = 300
        }
      }
    ]
  })
}
```

## Troubleshooting

### Common Issues

1. **No Alerts Received**
   ```bash
   # Check SNS topic subscriptions
   aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:us-east-1:123456789012:myapp-dev-nat-instance-alerts
   
   # Verify email subscription
   aws sns confirm-subscription --topic-arn arn:aws:sns:us-east-1:123456789012:myapp-dev-nat-instance-alerts --token TOKEN
   ```

2. **Dashboard Not Loading**
   ```bash
   # Check dashboard exists
   aws cloudwatch list-dashboards
   
   # Verify permissions
   aws iam get-role-policy --role-name CloudWatchRole --policy-name DashboardPolicy
   ```

3. **Recovery Lambda Failing**
   ```bash
   # Check Lambda logs
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/nat-recovery"
   
   # Test Lambda function
   aws lambda invoke --function-name myapp-dev-nat-recovery --payload '{}' response.json
   ```

### Monitoring Commands

```bash
# Check alarm status
aws cloudwatch describe-alarms --alarm-names "myapp-dev-nat-instance-memory-high"

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 3600 \
  --statistics Average

# Test SNS notification
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:myapp-dev-nat-instance-alerts \
  --message "Test notification"
```

## Best Practices

### Monitoring Strategy
1. **Start Simple**: Begin with basic CPU and network monitoring
2. **Add Gradually**: Introduce more metrics as application grows
3. **Review Regularly**: Monthly review of alert thresholds
4. **Cost Awareness**: Monitor monitoring costs vs value

### Alert Management
1. **Meaningful Thresholds**: Set thresholds based on actual usage
2. **Escalation Procedures**: Define who gets alerts when
3. **Alert Fatigue**: Avoid too many low-priority alerts
4. **Documentation**: Keep alert runbooks updated

### Recovery Procedures
1. **Test Regularly**: Validate recovery procedures monthly
2. **Manual Override**: Always have manual recovery options
3. **Escalation Path**: Define when to involve senior staff
4. **Post-Incident Review**: Learn from each incident

## Dependencies

This module requires:
- **AWS Provider**: >= 5.0
- **Archive Provider**: >= 2.0 (for Lambda deployment)
- **KMS Key**: Must exist for encryption
- **NAT Instance**: Must exist if monitoring enabled
- **Database Instance**: Must exist for database monitoring

## Version History

- **v1.0**: Basic CloudWatch alarms and dashboards
- **v1.1**: Added NAT instance monitoring
- **v1.2**: Lambda-based automated recovery
- **v1.3**: Cost optimization and log management
- **v2.0**: Modular architecture and comprehensive monitoring