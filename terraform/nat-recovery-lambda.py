#!/usr/bin/env python3
"""
NAT Instance Automated Recovery Lambda Function

This function monitors NAT instance state changes and automatically
handles recovery scenarios to maintain network connectivity.

Triggers:
- EC2 instance state changes (stopped, terminated)
- CloudWatch alarms for critical failures

Actions:
- Restart stopped instances
- Send SNS notifications
- Log all recovery actions
"""

import json
import boto3
import os
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
ec2 = boto3.client('ec2', region_name='${region}')
sns = boto3.client('sns', region_name='${region}')

def handler(event, context):
    """
    Main Lambda handler for NAT instance recovery
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get environment variables
        instance_id = os.environ.get('INSTANCE_ID')
        route_table_id = os.environ.get('ROUTE_TABLE_ID')
        sns_topic_arn = os.environ.get('SNS_TOPIC_ARN')
        
        if not all([instance_id, route_table_id, sns_topic_arn]):
            raise ValueError("Missing required environment variables")
        
        # Parse the event
        event_source = event.get('source')
        detail_type = event.get('detail-type')
        detail = event.get('detail', {})
        
        if event_source == 'aws.ec2' and detail_type == 'EC2 Instance State-change Notification':
            return handle_instance_state_change(event, instance_id, sns_topic_arn)
        elif event_source == 'aws.cloudwatch':
            return handle_cloudwatch_alarm(event, instance_id, sns_topic_arn)
        else:
            logger.warning(f"Unhandled event type: {event_source}/{detail_type}")
            return {
                'statusCode': 200,
                'body': json.dumps('Event type not handled')
            }
            
    except Exception as e:
        logger.error(f"Error processing event: {str(e)}")
        send_alert(sns_topic_arn, "NAT Recovery Error", f"Error in recovery function: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }

def handle_instance_state_change(event, instance_id, sns_topic_arn):
    """
    Handle EC2 instance state change events
    """
    detail = event.get('detail', {})
    event_instance_id = detail.get('instance-id')
    state = detail.get('state')
    
    # Only process events for our NAT instance
    if event_instance_id != instance_id:
        logger.info(f"State change for different instance: {event_instance_id}")
        return {'statusCode': 200, 'body': 'Not our instance'}
    
    logger.info(f"NAT instance {instance_id} state changed to: {state}")
    
    if state in ['stopped', 'stopping']:
        return handle_stopped_instance(instance_id, sns_topic_arn)
    elif state in ['terminated', 'terminating']:
        return handle_terminated_instance(instance_id, sns_topic_arn)
    else:
        logger.info(f"No action needed for state: {state}")
        return {'statusCode': 200, 'body': 'No action needed'}

def handle_stopped_instance(instance_id, sns_topic_arn):
    """
    Handle stopped NAT instance - attempt to restart
    """
    try:
        logger.info(f"Attempting to start stopped NAT instance: {instance_id}")
        
        # Check instance status first
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        current_state = instance['State']['Name']
        
        if current_state == 'stopped':
            # Start the instance
            start_response = ec2.start_instances(InstanceIds=[instance_id])
            logger.info(f"Start command sent: {start_response}")
            
            # Send notification
            message = f"""
NAT Instance Recovery Action

Instance ID: {instance_id}
Action: Started stopped instance
Time: {datetime.utcnow().isoformat()}
Status: Success

The NAT instance was automatically restarted to maintain network connectivity.
Please monitor the instance and verify connectivity from private subnets.
"""
            send_alert(sns_topic_arn, "NAT Instance Automatically Restarted", message)
            
            return {
                'statusCode': 200,
                'body': json.dumps(f'Successfully started instance {instance_id}')
            }
        else:
            logger.warning(f"Instance is in {current_state} state, cannot start")
            return {
                'statusCode': 400,
                'body': json.dumps(f'Instance in {current_state} state')
            }
            
    except Exception as e:
        logger.error(f"Failed to start instance: {str(e)}")
        send_alert(sns_topic_arn, "NAT Recovery Failed", 
                  f"Failed to restart NAT instance {instance_id}: {str(e)}")
        raise

def handle_terminated_instance(instance_id, sns_topic_arn):
    """
    Handle terminated NAT instance - send critical alert
    """
    logger.critical(f"NAT instance {instance_id} has been terminated!")
    
    message = f"""
CRITICAL: NAT Instance Terminated

Instance ID: {instance_id}
Action: Instance terminated
Time: {datetime.utcnow().isoformat()}
Impact: Private subnet connectivity lost

IMMEDIATE ACTION REQUIRED:
1. Launch new NAT instance or enable Auto Scaling Group
2. Update route tables to point to new instance
3. Verify connectivity from private subnets

This is a critical infrastructure failure requiring immediate attention.
"""
    
    send_alert(sns_topic_arn, "CRITICAL: NAT Instance Terminated", message)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Critical alert sent for terminated instance')
    }

def handle_cloudwatch_alarm(event, instance_id, sns_topic_arn):
    """
    Handle CloudWatch alarm events
    """
    detail = event.get('detail', {})
    alarm_name = detail.get('alarmName', 'Unknown')
    new_state = detail.get('newState', {})
    state_value = new_state.get('value', 'Unknown')
    state_reason = new_state.get('reason', 'No reason provided')
    
    logger.info(f"CloudWatch alarm {alarm_name} state: {state_value}")
    
    if state_value == 'ALARM':
        # Check if this is a critical alarm that requires action
        if 'health' in alarm_name.lower() or 'status' in alarm_name.lower():
            return handle_health_check_failure(instance_id, alarm_name, state_reason, sns_topic_arn)
        else:
            # Just send notification for non-critical alarms
            message = f"""
NAT Instance Alert

Alarm: {alarm_name}
State: {state_value}
Reason: {state_reason}
Instance: {instance_id}
Time: {datetime.utcnow().isoformat()}

Please investigate the issue and take appropriate action if needed.
"""
            send_alert(sns_topic_arn, f"NAT Instance Alert: {alarm_name}", message)
    
    return {
        'statusCode': 200,
        'body': json.dumps(f'Processed alarm: {alarm_name}')
    }

def handle_health_check_failure(instance_id, alarm_name, reason, sns_topic_arn):
    """
    Handle health check failures - attempt instance reboot
    """
    try:
        logger.warning(f"Health check failure for {instance_id}: {reason}")
        
        # Check instance status
        response = ec2.describe_instance_status(InstanceIds=[instance_id])
        if not response['InstanceStatuses']:
            logger.error("No instance status found")
            return {'statusCode': 404, 'body': 'Instance status not found'}
        
        status = response['InstanceStatuses'][0]
        instance_status = status['InstanceStatus']['Status']
        system_status = status['SystemStatus']['Status']
        
        logger.info(f"Instance status: {instance_status}, System status: {system_status}")
        
        # If status checks are failing, try reboot
        if instance_status != 'ok' or system_status != 'ok':
            logger.info(f"Attempting to reboot instance {instance_id}")
            
            reboot_response = ec2.reboot_instances(InstanceIds=[instance_id])
            logger.info(f"Reboot command sent: {reboot_response}")
            
            message = f"""
NAT Instance Recovery Action

Instance ID: {instance_id}
Action: Rebooted due to health check failure
Alarm: {alarm_name}
Reason: {reason}
Time: {datetime.utcnow().isoformat()}

The NAT instance was automatically rebooted to recover from health check failures.
Please monitor the instance status and verify connectivity.
"""
            send_alert(sns_topic_arn, "NAT Instance Automatically Rebooted", message)
            
            return {
                'statusCode': 200,
                'body': json.dumps(f'Successfully rebooted instance {instance_id}')
            }
        else:
            logger.info("Status checks are OK, no reboot needed")
            return {
                'statusCode': 200,
                'body': json.dumps('Status checks OK, no action needed')
            }
            
    except Exception as e:
        logger.error(f"Failed to handle health check failure: {str(e)}")
        send_alert(sns_topic_arn, "NAT Recovery Failed", 
                  f"Failed to handle health check failure for {instance_id}: {str(e)}")
        raise

def send_alert(sns_topic_arn, subject, message):
    """
    Send alert via SNS
    """
    try:
        response = sns.publish(
            TopicArn=sns_topic_arn,
            Subject=subject,
            Message=message
        )
        logger.info(f"Alert sent: {response['MessageId']}")
    except Exception as e:
        logger.error(f"Failed to send alert: {str(e)}")

# For testing
if __name__ == "__main__":
    # Test event
    test_event = {
        "source": "aws.ec2",
        "detail-type": "EC2 Instance State-change Notification",
        "detail": {
            "instance-id": "i-1234567890abcdef0",
            "state": "stopped"
        }
    }
    
    # Mock environment
    os.environ['INSTANCE_ID'] = 'i-1234567890abcdef0'
    os.environ['ROUTE_TABLE_ID'] = 'rtb-1234567890abcdef0'
    os.environ['SNS_TOPIC_ARN'] = 'arn:aws:sns:us-east-1:123456789012:test-topic'
    
    # Test handler
    result = handler(test_event, None)
    print(json.dumps(result, indent=2))