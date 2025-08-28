#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function getDatabaseCredentials() {
  const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const secretName = process.env.DB_CREDENTIALS_SECRET_ARN;
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

async function checkGameSpread() {
  let pool;
  
  try {
    // Check if using local or AWS database
    const useLocal = !process.env.DB_CREDENTIALS_SECRET_ARN;
    
    if (useLocal) {
      pool = new Pool({
        user: process.env.DB_USER || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        host: 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'pickem',
      });
    } else {
      const credentials = await getDatabaseCredentials();
      pool = new Pool({
        user: credentials.username,
        password: credentials.password,
        host: '52.5.36.87',
        port: 6432,
        database: credentials.dbname,
        ssl: false,
        max: 5,
      });
    }

    // Find Virginia Tech @ South Carolina game
    console.log('🔍 Searching for Virginia Tech @ South Carolina game...');
    
    const gameResult = await pool.query(`
      SELECT id, away_team, home_team, spread_home, spread_away, 
             moneyline_home, moneyline_away, commence_time
      FROM games 
      WHERE (away_team LIKE '%Virginia%' OR away_team LIKE '%Tech%') 
         AND (home_team LIKE '%South Carolina%' OR home_team LIKE '%Carolina%')
         OR (home_team LIKE '%Virginia%' OR home_team LIKE '%Tech%') 
         AND (away_team LIKE '%South Carolina%' OR away_team LIKE '%Carolina%')
      ORDER BY commence_time DESC
    `);
    
    if (gameResult.rows.length === 0) {
      console.log('❌ Game not found. Let me search for similar games...');
      
      // Broader search
      const broadResult = await pool.query(`
        SELECT id, away_team, home_team, spread_home, spread_away
        FROM games 
        WHERE away_team ILIKE '%virginia%' OR home_team ILIKE '%virginia%'
           OR away_team ILIKE '%carolina%' OR home_team ILIKE '%carolina%'
        ORDER BY commence_time DESC
        LIMIT 10
      `);
      
      console.log(`\n🔍 Found ${broadResult.rows.length} games with Virginia or Carolina:`);
      broadResult.rows.forEach(game => {
        console.log(`  ${game.id}: ${game.away_team} @ ${game.home_team}`);
        console.log(`    Home spread: ${game.spread_home}, Away spread: ${game.spread_away}`);
      });
      return;
    }
    
    const game = gameResult.rows[0];
    console.log('\n🎮 Game Details:');
    console.log(`  ID: ${game.id}`);
    console.log(`  Away: ${game.away_team}`);
    console.log(`  Home: ${game.home_team}`);
    console.log(`  Home Spread: ${game.spread_home}`);
    console.log(`  Away Spread: ${game.spread_away}`);
    console.log(`  Home Moneyline: ${game.moneyline_home}`);
    console.log(`  Away Moneyline: ${game.moneyline_away}`);
    console.log(`  Game Time: ${game.commence_time}`);
    
    // Analysis
    console.log('\n🔍 Analysis:');
    if (game.spread_home !== null && game.spread_away !== null) {
      const expectedAwaySpread = -game.spread_home;
      console.log(`  Expected away spread (based on home): ${expectedAwaySpread}`);
      console.log(`  Actual away spread in DB: ${game.spread_away}`);
      
      if (Math.abs(expectedAwaySpread - game.spread_away) < 0.01) {
        console.log('  ✅ Spreads appear correct (away = -home)');
      } else {
        console.log('  ❌ Spreads appear incorrect (away ≠ -home)');
      }
    }
    
    // Check how this would display in UI
    console.log('\n📱 How this appears in UI:');
    if (game.spread_home !== null) {
      const homeSpreadText = game.spread_home > 0 ? `+${game.spread_home}` : `${game.spread_home}`;
      const calculatedAwaySpread = -game.spread_home;
      const awaySpreadText = calculatedAwaySpread > 0 ? `+${calculatedAwaySpread}` : `${calculatedAwaySpread}`;
      
      console.log(`  ${game.home_team} ${homeSpreadText}`);
      console.log(`  ${game.away_team} ${awaySpreadText}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

checkGameSpread();