# Cognito Module

This module creates a complete AWS Cognito User Pool setup for user authentication and authorization, including user pool, client configuration, domain setup, and security policies.

## Architecture

- **User Pool**: Central user directory with password policies and MFA
- **User Pool Client**: Application-specific client configuration
- **Hosted UI Domain**: Custom domain for authentication flows
- **Security Features**: MFA, account recovery, and device tracking
- **OAuth Integration**: Support for OAuth 2.0 flows

## Features

### Authentication
- Username/email/phone authentication
- Social identity providers (configurable)
- Multi-factor authentication (MFA)
- Password complexity requirements

### Security
- Account lockout policies
- Password history enforcement
- Device tracking and remember device
- Secure password recovery

### Integration
- OAuth 2.0 and OpenID Connect
- Hosted UI for quick implementation
- Custom domains for branding
- JWT token validation

## Usage

### Basic Usage

```hcl
module "cognito" {
  source = "./modules/cognito"

  project_name = "myapp"
  environment  = "dev"
  aws_region   = "us-east-1"
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

### Production Configuration

```hcl
module "cognito" {
  source = "./modules/cognito"

  project_name = "myapp"
  environment  = "prod"
  aws_region   = "us-east-1"
  
  common_tags = {
    Project     = "myapp"
    Environment = "prod"
    ManagedBy   = "terraform"
    Security    = "enhanced"
  }
}
```

### Development Configuration

```hcl
module "cognito" {
  source = "./modules/cognito"

  project_name = "myapp"
  environment  = "dev"
  aws_region   = "us-east-1"
  
  common_tags = {
    Project     = "myapp"
    Environment = "dev"
    ManagedBy   = "terraform"
    Purpose     = "development"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| aws_region | AWS region | `string` | n/a | yes |
| common_tags | Common tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| user_pool_id | ID of the Cognito User Pool |
| user_pool_client_id | ID of the Cognito User Pool Client |
| user_pool_endpoint | Endpoint name of the Cognito User Pool |
| user_pool_domain | Domain name of the Cognito User Pool |
| user_pool_hosted_ui_url | Hosted UI URL for the Cognito User Pool |

## Security Configuration

### Password Policy
```hcl
password_policy {
  minimum_length    = 8
  require_lowercase = true
  require_uppercase = true
  require_numbers   = true
  require_symbols   = true
}
```

### Multi-Factor Authentication
- **Production**: MFA required (`"ON"`)
- **Development**: MFA optional (`"OPTIONAL"`)
- **TOTP Support**: Software token MFA enabled in production

### Account Recovery
- **Primary Method**: Email verification
- **Priority**: 1 (highest)
- **Backup Methods**: Can be extended to include SMS

### Device Configuration
```hcl
device_configuration {
  challenge_required_on_new_device      = true
  device_only_remembered_on_user_prompt = false
}
```

## OAuth 2.0 Configuration

### Supported Flows
- **Authorization Code Flow**: `"code"`
- **Implicit Flow**: `"implicit"`
- **Scopes**: `["email", "openid", "profile"]`

### Callback URLs
The module configures default callback URLs:
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://project-env.example.com/auth/callback`

### Token Validity
```hcl
access_token_validity  = 60    # 1 hour
id_token_validity     = 60    # 1 hour
refresh_token_validity = 30   # 30 days
```

## User Attributes

### Required Attributes
- Email address (auto-verified)
- Preferred username

### Read Permissions
- `email`
- `email_verified`
- `preferred_username`

### Write Permissions
- `email`
- `preferred_username`

## Integration Examples

### React Application Integration

```javascript
import { Amplify, Auth } from 'aws-amplify';

// Configure Amplify
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
    oauth: {
      domain: 'myapp-dev-auth.auth.us-east-1.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'http://localhost:3000/auth/callback',
      redirectSignOut: 'http://localhost:3000/auth/logout',
      responseType: 'code'
    }
  }
});

// Sign in user
const signIn = async (username, password) => {
  try {
    const user = await Auth.signIn(username, password);
    console.log('Sign in successful:', user);
    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Sign up user
const signUp = async (username, password, email) => {
  try {
    const { user } = await Auth.signUp({
      username,
      password,
      attributes: {
        email
      }
    });
    console.log('Sign up successful:', user);
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Get current user
const getCurrentUser = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser();
    return user;
  } catch (error) {
    console.log('No authenticated user');
    return null;
  }
};
```

### Next.js Integration

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

export default NextAuth({
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER,
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

// Environment variables (.env.local)
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
```

### Lambda Function Integration

```python
import json
import boto3
from jose import jwk, jwt
from jose.utils import base64url_decode
import requests

# Cognito configuration
COGNITO_REGION = 'us-east-1'
COGNITO_USER_POOL_ID = 'us-east-1_XXXXXXXXX'
COGNITO_APP_CLIENT_ID = 'XXXXXXXXXXXXXXXXXXXXXXXXXX'

def lambda_handler(event, context):
    """Validate Cognito JWT token"""
    
    # Extract token from Authorization header
    auth_header = event.get('headers', {}).get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Missing or invalid Authorization header'})
        }
    
    token = auth_header.split(' ')[1]
    
    try:
        # Validate token
        user_info = validate_cognito_token(token)
        
        # Process authenticated request
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Authenticated request successful',
                'user': user_info
            })
        }
    except Exception as e:
        return {
            'statusCode': 401,
            'body': json.dumps({'error': str(e)})
        }

def validate_cognito_token(token):
    """Validate Cognito JWT token"""
    
    # Get Cognito public keys
    keys_url = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json'
    response = requests.get(keys_url)
    keys = response.json()['keys']
    
    # Decode token header
    headers = jwt.get_unverified_headers(token)
    kid = headers['kid']
    
    # Find the correct key
    key = None
    for k in keys:
        if k['kid'] == kid:
            key = k
            break
    
    if not key:
        raise Exception('Public key not found')
    
    # Construct the public key
    public_key = jwk.construct(key)
    
    # Verify token
    message, encoded_signature = str(token).rsplit('.', 1)
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
    
    if not public_key.verify(message.encode('utf8'), decoded_signature):
        raise Exception('Token signature verification failed')
    
    # Decode token payload
    claims = jwt.get_unverified_claims(token)
    
    # Verify token claims
    if claims['aud'] != COGNITO_APP_CLIENT_ID:
        raise Exception('Token audience verification failed')
    
    if claims['iss'] != f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}':
        raise Exception('Token issuer verification failed')
    
    if claims['token_use'] != 'access':
        raise Exception('Token is not an access token')
    
    return {
        'username': claims.get('username'),
        'email': claims.get('email'),
        'sub': claims.get('sub')
    }
```

## Hosted UI Customization

### Access Hosted UI
```
https://myapp-dev-auth.auth.us-east-1.amazoncognito.com/login?client_id=XXXXXXXXXXXXXXXXXXXXXXXXXX&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:3000/auth/callback
```

### CSS Customization
```css
/* Custom CSS for Hosted UI */
.banner-customizable {
    background-color: #1a73e8;
}

.label-customizable {
    color: #333;
    font-weight: 500;
}

.textDescription-customizable {
    color: #666;
}

.button-customizable {
    background-color: #1a73e8;
    border-color: #1a73e8;
}

.button-customizable:hover {
    background-color: #1557b0;
    border-color: #1557b0;
}
```

## Social Identity Providers

### Configure Google Provider

```hcl
# Add to cognito main.tf
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.pickem_user_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
    authorize_scopes = "email profile openid"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

# Update user pool client
resource "aws_cognito_user_pool_client" "pickem_user_pool_client" {
  # ... existing configuration ...
  
  supported_identity_providers = ["COGNITO", "Google"]
}
```

### Configure Facebook Provider

```hcl
resource "aws_cognito_identity_provider" "facebook" {
  user_pool_id  = aws_cognito_user_pool.pickem_user_pool.id
  provider_name = "Facebook"
  provider_type = "Facebook"

  provider_details = {
    client_id     = var.facebook_app_id
    client_secret = var.facebook_app_secret
    authorize_scopes = "email"
  }

  attribute_mapping = {
    email    = "email"
    username = "id"
    name     = "name"
  }
}
```

## User Management

### Create User Programmatically

```python
import boto3

def create_user(username, email, temporary_password):
    """Create a new user in Cognito User Pool"""
    
    client = boto3.client('cognito-idp', region_name='us-east-1')
    
    try:
        response = client.admin_create_user(
            UserPoolId='us-east-1_XXXXXXXXX',
            Username=username,
            UserAttributes=[
                {
                    'Name': 'email',
                    'Value': email
                },
                {
                    'Name': 'email_verified',
                    'Value': 'true'
                }
            ],
            TemporaryPassword=temporary_password,
            MessageAction='SUPPRESS'  # Don't send welcome email
        )
        
        print(f"User {username} created successfully")
        return response['User']
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return None
```

### List Users

```python
def list_users(limit=60):
    """List users in Cognito User Pool"""
    
    client = boto3.client('cognito-idp', region_name='us-east-1')
    
    try:
        response = client.list_users(
            UserPoolId='us-east-1_XXXXXXXXX',
            Limit=limit
        )
        
        users = []
        for user in response['Users']:
            user_info = {
                'username': user['Username'],
                'status': user['UserStatus'],
                'created': user['UserCreateDate'],
                'attributes': {attr['Name']: attr['Value'] for attr in user['Attributes']}
            }
            users.append(user_info)
        
        return users
        
    except Exception as e:
        print(f"Error listing users: {str(e)}")
        return []
```

## Monitoring and Analytics

### CloudWatch Metrics

Cognito automatically publishes metrics to CloudWatch:

- `SignUpSuccesses`
- `SignUpThrottles`
- `SignInSuccesses`
- `SignInThrottles`
- `TokenRefreshSuccesses`
- `TokenRefreshThrottles`

### Custom Monitoring Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "cognito_metrics" {
  dashboard_name = "${var.project_name}-${var.environment}-cognito-metrics"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Cognito", "SignUpSuccesses", "UserPool", aws_cognito_user_pool.pickem_user_pool.id],
            [".", "SignInSuccesses", ".", "."],
            [".", "SignUpThrottles", ".", "."],
            [".", "SignInThrottles", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Cognito Authentication Metrics"
        }
      }
    ]
  })
}
```

## Security Best Practices

### Environment-Specific Security

1. **Production Environment**:
   - MFA required
   - Strong password policies
   - Account lockout enabled
   - Custom domains with SSL

2. **Development Environment**:
   - MFA optional
   - Relaxed password policies
   - Quick testing configurations

### Token Security

```javascript
// Secure token storage in browser
const secureStorage = {
  setToken: (token) => {
    // Use httpOnly cookies in production
    if (process.env.NODE_ENV === 'production') {
      document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict`;
    } else {
      localStorage.setItem('auth_token', token);
    }
  },
  
  getToken: () => {
    if (process.env.NODE_ENV === 'production') {
      // Extract from httpOnly cookie on server side
      return null; // Handle server-side
    } else {
      return localStorage.getItem('auth_token');
    }
  }
};
```

## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   ```bash
   # Check configured callback URLs
   aws cognito-idp describe-user-pool-client \
     --user-pool-id us-east-1_XXXXXXXXX \
     --client-id XXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

2. **Token Validation Failures**
   ```bash
   # Verify token structure
   echo "JWT_TOKEN" | cut -d. -f2 | base64 -d | jq
   ```

3. **MFA Setup Issues**
   ```bash
   # Check MFA configuration
   aws cognito-idp describe-user-pool \
     --user-pool-id us-east-1_XXXXXXXXX \
     --query 'UserPool.MfaConfiguration'
   ```

### Debug Commands

```bash
# Get user pool configuration
aws cognito-idp describe-user-pool --user-pool-id us-east-1_XXXXXXXXX

# List user pool clients
aws cognito-idp list-user-pool-clients --user-pool-id us-east-1_XXXXXXXXX

# Check user status
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com

# Reset user password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com \
  --password "NewPassword123!" \
  --permanent
```

## Cost Considerations

### Cognito Pricing
- **Monthly Active Users (MAU)**: $0.0055 per MAU for first 50,000 users
- **Advanced Security Features**: Additional $0.05 per MAU
- **SMS Messages**: $0.00742 per SMS (MFA)

### Cost Optimization
- Use email for MFA instead of SMS when possible
- Disable advanced security features in development
- Monitor MAU usage regularly

### Example Monthly Costs

| Users | Basic Cognito | With Advanced Security |
|-------|--------------|----------------------|
| 100 | $0.55 | $5.55 |
| 1,000 | $5.50 | $55.00 |
| 10,000 | $55.00 | $550.00 |

## Dependencies

This module requires:
- **AWS Provider**: >= 5.0
- **Valid AWS Region**: For Cognito service availability
- **Domain Configuration**: For custom hosted UI domains (optional)

## Version History

- **v1.0**: Basic User Pool and Client configuration
- **v1.1**: Added OAuth 2.0 support and hosted UI
- **v1.2**: Enhanced security features and MFA
- **v1.3**: Social identity provider support
- **v2.0**: Modular architecture and comprehensive documentation