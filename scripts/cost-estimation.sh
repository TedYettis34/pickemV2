#!/bin/bash

# PickEm Application Cost Estimation Script
# This script helps estimate monthly AWS costs for different configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGION=${AWS_REGION:-"us-east-1"}
ENVIRONMENT=${ENVIRONMENT:-"dev"}
USERS=${USERS:-50}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   PickEm Cost Estimation Tool${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo -e "Expected Users: ${YELLOW}$USERS${NC}"
echo ""

# Function to calculate costs
calculate_costs() {
    local config_type=$1
    
    case $config_type in
        "current")
            if [ "$ENVIRONMENT" = "prod" ]; then
                database_min=43
                database_max=1380
            else
                database_min=43
                database_max=345
            fi
            rds_proxy=40
            nat_gateways=90
            monitoring=30
            total_min=$((database_min + rds_proxy + nat_gateways + monitoring))
            total_max=$((database_max + rds_proxy + nat_gateways + monitoring))
            ;;
        "optimized")
            database_min=12
            database_max=15
            rds_proxy=0  # Remove RDS Proxy
            nat_gateways=45  # Single NAT Gateway
            monitoring=5
            total_min=$((database_min + rds_proxy + nat_gateways + monitoring))
            total_max=$((database_max + rds_proxy + nat_gateways + monitoring))
            ;;
        "ultra")
            database_min=8
            database_max=10
            rds_proxy=0
            nat_gateways=6  # NAT Instance
            monitoring=2
            total_min=$((database_min + rds_proxy + nat_gateways + monitoring))
            total_max=$((database_max + rds_proxy + nat_gateways + monitoring))
            ;;
    esac
    
    echo "$total_min $total_max $database_min $database_max $nat_gateways $monitoring"
}

# Calculate costs for all configurations
echo -e "${GREEN}Monthly Cost Estimates (USD):${NC}"
echo ""

current_costs=($(calculate_costs "current"))
optimized_costs=($(calculate_costs "optimized"))
ultra_costs=($(calculate_costs "ultra"))

printf "%-25s %-15s %-15s %-15s %-15s %-15s\n" "Configuration" "Total Cost" "Database" "NAT/Network" "Monitoring" "Savings"
printf "%-25s %-15s %-15s %-15s %-15s %-15s\n" "-------------" "----------" "--------" "-----------" "----------" "-------"

printf "%-25s \$%-14s \$%-14s \$%-14s \$%-14s %-15s\n" "Current Aurora Setup" "${current_costs[0]}-${current_costs[1]}" "${current_costs[2]}-${current_costs[3]}" "\$${current_costs[4]}" "\$${current_costs[5]}" "Baseline"

optimized_savings_min=$((current_costs[0] - optimized_costs[0]))
optimized_savings_max=$((current_costs[1] - optimized_costs[1]))
printf "%-25s \$%-14s \$%-14s \$%-14s \$%-14s \$%-14s\n" "Cost Optimized RDS" "${optimized_costs[0]}-${optimized_costs[1]}" "${optimized_costs[2]}-${optimized_costs[3]}" "\$${optimized_costs[4]}" "\$${optimized_costs[5]}" "${optimized_savings_min}-${optimized_savings_max}"

ultra_savings_min=$((current_costs[0] - ultra_costs[0]))
ultra_savings_max=$((current_costs[1] - ultra_costs[1]))
printf "%-25s \$%-14s \$%-14s \$%-14s \$%-14s \$%-14s\n" "Ultra Optimized" "${ultra_costs[0]}-${ultra_costs[1]}" "${ultra_costs[2]}-${ultra_costs[3]}" "\$${ultra_costs[4]}" "\$${ultra_costs[5]}" "${ultra_savings_min}-${ultra_savings_max}"

echo ""
echo -e "${YELLOW}Annual Savings Estimates:${NC}"
optimized_annual_min=$((optimized_savings_min * 12))
optimized_annual_max=$((optimized_savings_max * 12))
ultra_annual_min=$((ultra_savings_min * 12))
ultra_annual_max=$((ultra_savings_max * 12))

echo "Cost Optimized: \$${optimized_annual_min} - \$${optimized_annual_max} per year"
echo "Ultra Optimized: \$${ultra_annual_min} - \$${ultra_annual_max} per year"

echo ""
echo -e "${GREEN}Recommendations for $USERS users:${NC}"

if [ $USERS -le 50 ]; then
    echo -e "✓ ${GREEN}Cost Optimized configuration recommended${NC}"
    echo -e "✓ ${GREEN}Ultra Optimized acceptable for tight budgets${NC}"
elif [ $USERS -le 100 ]; then
    echo -e "✓ ${GREEN}Cost Optimized configuration recommended${NC}"
    echo -e "⚠ ${YELLOW}Ultra Optimized may have performance issues${NC}"
else
    echo -e "⚠ ${YELLOW}Consider keeping current setup or moderate optimization${NC}"
    echo -e "⚠ ${YELLOW}Monitor performance closely with cost optimizations${NC}"
fi

echo ""
echo -e "${BLUE}Cost Optimization Quick Start:${NC}"
echo "1. Copy terraform.tfvars.cost-optimized to terraform.tfvars"
echo "2. Set cost_optimized_mode = true"
echo "3. Run: terraform plan -var='cost_optimized_mode=true'"
echo "4. Review changes and apply during maintenance window"
echo ""

# Check if AWS CLI is available and show current costs
if command -v aws &> /dev/null; then
    echo -e "${BLUE}Current AWS Account Cost Information:${NC}"
    
    # Get current month costs (requires billing access)
    current_month=$(date +%Y-%m)
    echo "Checking costs for $current_month..."
    
    if aws ce get-cost-and-usage --time-period Start=${current_month}-01,End=${current_month}-$(date +%d) --granularity MONTHLY --metrics BlittedCost 2>/dev/null; then
        echo "✓ AWS Cost Explorer data retrieved"
    else
        echo "⚠ Unable to retrieve AWS cost data (requires billing permissions)"
    fi
    
    echo ""
    echo -e "${YELLOW}Set up AWS Budget Alert:${NC}"
    echo "aws budgets create-budget --account-id \$(aws sts get-caller-identity --query Account --output text) --budget file://budget.json"
    
    # Create budget JSON
    cat > budget.json << EOF
{
    "BudgetName": "PickEm-Monthly-Budget",
    "BudgetLimit": {
        "Amount": "${optimized_costs[1]}",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
        "TagKey": ["Project"],
        "TagValue": ["pickem"]
    }
}
EOF
    echo "Budget configuration saved to budget.json"
else
    echo "Install AWS CLI to get real-time cost information"
fi

echo ""
echo -e "${GREEN}Cost tracking recommendations:${NC}"
echo "• Set up AWS Budget alerts"
echo "• Use AWS Cost Explorer monthly"
echo "• Tag all resources with Project=pickem"
echo "• Monitor CloudWatch billing alarms"
echo "• Review costs weekly during initial period"

echo ""
echo -e "${BLUE}======================================${NC}"