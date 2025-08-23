#!/usr/bin/env node

/**
 * Migration script to sync all existing Cognito users to the database
 * This script uses admin privileges to list all Cognito users and sync them
 */

const { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  ssl: false // Local development
});

// Cognito client configuration
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;

if (!USER_POOL_ID) {
  console.error('Error: NEXT_PUBLIC_USER_POOL_ID is not set in environment variables');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('POOL')));
  process.exit(1);
}

/**
 * Get user attribute value by name
 */
function getUserAttribute(user, attributeName) {
  const attribute = user.Attributes?.find(attr => attr.Name === attributeName);
  return attribute?.Value || null;
}

/**
 * Check if user exists in database
 */
async function getUserByCognitoId(cognitoUserId) {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE cognito_user_id = $1',
      [cognitoUserId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Error checking user ${cognitoUserId} in database:`, error);
    return null;
  }
}

/**
 * Create or update user in database
 */
async function createOrUpdateUser(cognitoUser) {
  const cognitoUserId = getUserAttribute(cognitoUser, 'sub'); // Use sub (unique ID) instead of username
  const email = getUserAttribute(cognitoUser, 'email');
  const name = getUserAttribute(cognitoUser, 'name');
  const givenName = getUserAttribute(cognitoUser, 'given_name');
  const familyName = getUserAttribute(cognitoUser, 'family_name');
  
  if (!cognitoUserId) {
    console.warn(`Skipping user ${cognitoUser.Username}: No sub attribute found`);
    return null;
  }

  if (!email) {
    const availableAttributes = cognitoUser.Attributes?.map(attr => attr.Name) || [];
    console.warn(`Skipping user ${cognitoUserId}: No email attribute. Available: ${availableAttributes.join(', ')}`);
    return null;
  }

  // Generate display name using the same logic as the sync function
  const displayName = name || 
                     (givenName && familyName ? `${givenName} ${familyName}` : givenName || familyName) || 
                     cognitoUser.Username || 
                     email.split('@')[0] || 
                     'User';

  try {
    // Check if user exists
    const existingUser = await getUserByCognitoId(cognitoUserId);
    
    if (existingUser) {
      // Update existing user
      const result = await pool.query(
        `UPDATE users 
         SET email = $2, name = $3, updated_at = CURRENT_TIMESTAMP
         WHERE cognito_user_id = $1
         RETURNING *`,
        [cognitoUserId, email, displayName]
      );
      console.log(`✓ Updated user: ${displayName} (${email})`);
      return result.rows[0];
    } else {
      // Create new user
      const result = await pool.query(
        `INSERT INTO users (cognito_user_id, email, name, timezone)
         VALUES ($1, $2, $3, 'America/New_York')
         RETURNING *`,
        [cognitoUserId, email, displayName]
      );
      console.log(`✓ Created user: ${displayName} (${email})`);
      return result.rows[0];
    }
  } catch (error) {
    console.error(`Error creating/updating user ${cognitoUserId}:`, error);
    return null;
  }
}

/**
 * Get all users from Cognito User Pool
 */
async function getAllCognitoUsers() {
  const users = [];
  let paginationToken = undefined;
  
  try {
    do {
      const command = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60, // Max allowed by AWS
        PaginationToken: paginationToken,
      });
      
      const response = await cognitoClient.send(command);
      
      if (response.Users) {
        users.push(...response.Users);
      }
      
      paginationToken = response.PaginationToken;
    } while (paginationToken);
    
    return users;
  } catch (error) {
    console.error('Error listing Cognito users:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateCognitoUsers() {
  console.log('🚀 Starting Cognito users migration...');
  console.log(`📊 User Pool ID: ${USER_POOL_ID}`);
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
    
    // Get all users from Cognito
    console.log('📋 Fetching all users from Cognito...');
    const cognitoUsers = await getAllCognitoUsers();
    console.log(`📊 Found ${cognitoUsers.length} users in Cognito`);
    
    if (cognitoUsers.length === 0) {
      console.log('ℹ️  No users found in Cognito User Pool');
      return;
    }
    
    // Show user summary
    console.log('\n👥 Cognito users:');
    cognitoUsers.forEach((user, index) => {
      const email = getUserAttribute(user, 'email');
      const name = getUserAttribute(user, 'name');
      const status = user.UserStatus;
      console.log(`  ${index + 1}. ${user.Username} - ${name || 'No Name'} (${email || 'No Email'}) - ${status}`);
    });
    
    console.log('\n🔄 Starting migration...');
    
    // Migrate each user
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const cognitoUser of cognitoUsers) {
      try {
        const result = await createOrUpdateUser(cognitoUser);
        if (result) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to migrate user ${cognitoUser.Username}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ⚠️  Skipped: ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📋 Total processed: ${cognitoUsers.length}`);
    
    // Show final database state
    const dbUsers = await pool.query('SELECT cognito_user_id, email, name FROM users ORDER BY created_at');
    console.log(`\n🗄️  Database now contains ${dbUsers.rows.length} users:`);
    dbUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Cognito ID: ${user.cognito_user_id}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n✅ Migration completed');
  }
}

// Run the migration
if (require.main === module) {
  migrateCognitoUsers()
    .then(() => {
      console.log('🎉 Migration finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCognitoUsers };