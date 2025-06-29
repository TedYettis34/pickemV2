#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs SQL migration files in order against the PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Configuration
const SCHEMA_DIR = path.join(__dirname, '../database/schema');
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DB_CREDENTIALS_SECRET_ARN = process.env.DB_CREDENTIALS_SECRET_ARN;

if (!DB_CREDENTIALS_SECRET_ARN) {
  console.error('❌ DB_CREDENTIALS_SECRET_ARN environment variable is required');
  process.exit(1);
}

/**
 * Get database credentials from AWS Secrets Manager
 */
async function getDatabaseCredentials() {
  const secretsClient = new SecretsManagerClient({ region: AWS_REGION });
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: DB_CREDENTIALS_SECRET_ARN,
    });
    
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('No secret string found in response');
    }
    
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error('❌ Error retrieving database credentials:', error.message);
    throw error;
  }
}

/**
 * Create database connection pool
 */
async function createDatabasePool() {
  const credentials = await getDatabaseCredentials();
  
  // Parse host to remove port if included
  const host = credentials.host.includes(':') 
    ? credentials.host.split(':')[0] 
    : credentials.host;
  
  return new Pool({
    user: credentials.username,
    password: credentials.password,
    host: host,
    port: credentials.port,
    database: credentials.dbname,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Run a single SQL file
 */
async function runSqlFile(pool, filePath) {
  const fileName = path.basename(filePath);
  console.log(`📄 Running migration: ${fileName}`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    await pool.query(sqlContent);
    console.log(`✅ Successfully ran: ${fileName}`);
  } catch (error) {
    console.error(`❌ Error running ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  let pool;
  
  try {
    console.log('🚀 Starting database migrations...');
    console.log(`📂 Schema directory: ${SCHEMA_DIR}`);
    
    // Create database connection
    pool = await createDatabasePool();
    console.log('🔗 Connected to database');
    
    // Get all SQL files in schema directory
    const files = fs.readdirSync(SCHEMA_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run in alphabetical order (001_, 002_, etc.)
    
    if (files.length === 0) {
      console.log('⚠️  No SQL migration files found');
      return;
    }
    
    console.log(`📋 Found ${files.length} migration file(s):`);
    files.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    // Run each migration file
    for (const file of files) {
      const filePath = path.join(SCHEMA_DIR, file);
      await runSqlFile(pool, filePath);
    }
    
    console.log('');
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };