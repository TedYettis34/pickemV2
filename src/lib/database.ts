import { Pool } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Database connection pool
let pool: Pool | null = null;

// Database credentials interface
interface DatabaseCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
}

// Get database credentials from AWS Secrets Manager
async function getDatabaseCredentials(): Promise<DatabaseCredentials> {
  const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const secretName = process.env.DB_CREDENTIALS_SECRET_ARN;
    if (!secretName) {
      throw new Error('DB_CREDENTIALS_SECRET_ARN environment variable is required');
    }

    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('No secret string found in response');
    }

    return JSON.parse(response.SecretString) as DatabaseCredentials;
  } catch (error) {
    console.error('Error retrieving database credentials:', error);
    throw error;
  }
}

// Initialize database connection pool
async function initializePool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let credentials: DatabaseCredentials;
    
    if (isDevelopment && !process.env.DB_CREDENTIALS_SECRET_ARN) {
      // Use local PostgreSQL credentials in development
      credentials = {
        username: process.env.DB_USER || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        engine: 'postgres',
        host: 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        dbname: process.env.DB_NAME || 'pickem',
      };
    } else {
      // Use AWS Secrets Manager in production or when explicitly configured
      credentials = await getDatabaseCredentials();
    }
    
    const host = isDevelopment && !process.env.DB_CREDENTIALS_SECRET_ARN ? 'localhost' : credentials.host;
    
    pool = new Pool({
      user: credentials.username,
      password: credentials.password,
      host: host,
      port: credentials.port,
      database: credentials.dbname,
      ssl: isDevelopment && !process.env.DB_CREDENTIALS_SECRET_ARN ? false : 
           credentials.host === '52.5.36.87' ? false : // PgBouncer doesn't need SSL from client
           {
             rejectUnauthorized: false, // Required for direct Aurora connections
           },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Test the connection
    await pool.query('SELECT 1');
    console.log('Database connection pool initialized successfully');
    
    return pool;
  } catch (error) {
    console.error('Error initializing database pool:', error);
    throw error;
  }
}

// Get database connection
export async function getDatabase(): Promise<Pool> {
  return await initializePool();
}

// Close database connection pool
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

// Database query helper with error handling
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const db = await getDatabase();
  
  try {
    const result = await db.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

// Database transaction helper
export async function transaction<T>(
  callback: (client: Pool) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client as unknown as Pool);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}