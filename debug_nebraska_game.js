const { Pool } = require('pg');
const { evaluatePick } = require('./src/lib/pickEvaluation');

// You'll need to update these connection details to match your database
const pool = new Pool({
  // Add your database connection details here
  // host: 'your-db-host',
  // port: 5432,
  // database: 'pickem',
  // user: 'your-username',
  // password: 'your-password',
  // ssl: true
});

async function debugNebraskaGame() {
  try {
    console.log('🔍 Debugging Nebraska vs Cincinnati Game Issue');
    console.log('='.repeat(60));
    
    // Find the Nebraska vs Cincinnati game
    const gameQuery = `
      SELECT g.id, g.home_team, g.away_team, g.home_score, g.away_score, 
             g.spread_home, g.spread_away, g.game_status, g.commence_time
      FROM games g 
      WHERE (g.home_team LIKE '%Nebraska%' OR g.away_team LIKE '%Nebraska%') 
        AND (g.home_team LIKE '%Cincinnati%' OR g.away_team LIKE '%Cincinnati%')
        AND g.home_score IS NOT NULL
        AND g.away_score IS NOT NULL
      ORDER BY g.commence_time DESC 
      LIMIT 1;
    `;
    
    const gameResult = await pool.query(gameQuery);
    
    if (gameResult.rows.length === 0) {
      console.log('❌ No Nebraska vs Cincinnati game found with scores');
      return;
    }
    
    const game = gameResult.rows[0];
    console.log('📊 Game Details:');
    console.log(`   ID: ${game.id}`);
    console.log(`   Home Team: ${game.home_team}`);
    console.log(`   Away Team: ${game.away_team}`);
    console.log(`   Home Score: ${game.home_score}`);
    console.log(`   Away Score: ${game.away_score}`);
    console.log(`   Home Spread: ${game.spread_home}`);
    console.log(`   Away Spread: ${game.spread_away}`);
    console.log(`   Game Status: ${game.game_status}`);
    console.log(`   Point Margin: ${game.home_score - game.away_score} (home perspective)`);
    console.log('');
    
    // Get all picks for this game
    const picksQuery = `
      SELECT p.id, p.user_id, p.pick_type, p.spread_value, p.result, p.submitted,
             u.name as username
      FROM picks p
      LEFT JOIN users u ON p.user_id = u.cognito_user_id
      WHERE p.game_id = $1
      ORDER BY p.user_id;
    `;
    
    const picksResult = await pool.query(picksQuery, [game.id]);
    
    if (picksResult.rows.length === 0) {
      console.log('❌ No picks found for this game');
      return;
    }
    
    console.log(`📋 Picks Analysis (${picksResult.rows.length} total picks):`);
    console.log('='.repeat(60));
    
    let nebraskaPicks = 0;
    let cincinnatiPicks = 0;
    let incorrectResults = [];
    
    for (const pick of picksResult.rows) {
      const username = pick.username || pick.user_id;
      
      // Determine which team they picked
      let pickedTeam = '';
      if (pick.pick_type === 'home_spread') {
        pickedTeam = game.home_team;
      } else {
        pickedTeam = game.away_team;
      }
      
      // Count picks by team
      if (pickedTeam.includes('Nebraska')) {
        nebraskaPicks++;
      } else if (pickedTeam.includes('Cincinnati')) {
        cincinnatiPicks++;
      }
      
      // Calculate what the result SHOULD be using our evaluation logic
      const mockPick = {
        id: pick.id,
        user_id: pick.user_id,
        game_id: game.id,
        pick_type: pick.pick_type,
        spread_value: pick.spread_value,
        submitted: pick.submitted,
        is_triple_play: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const expectedResult = evaluatePick(mockPick, game.home_score, game.away_score);
      
      console.log(`👤 ${username}:`);
      console.log(`   Picked: ${pickedTeam} ${pick.spread_value > 0 ? '+' : ''}${pick.spread_value}`);
      console.log(`   Stored Result: ${pick.result || 'null'}`);
      console.log(`   Expected Result: ${expectedResult}`);
      
      if (pick.result !== expectedResult) {
        console.log(`   ❌ MISMATCH DETECTED!`);
        incorrectResults.push({
          username,
          pickedTeam,
          spreadValue: pick.spread_value,
          storedResult: pick.result,
          expectedResult
        });
      } else {
        console.log(`   ✅ Correct`);
      }
      console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Nebraska picks: ${nebraskaPicks}`);
    console.log(`   Cincinnati picks: ${cincinnatiPicks}`);
    console.log(`   Incorrect results: ${incorrectResults.length}`);
    
    if (incorrectResults.length > 0) {
      console.log('');
      console.log('🐛 BUGS FOUND:');
      incorrectResults.forEach(bug => {
        console.log(`   ${bug.username}: Expected ${bug.expectedResult}, got ${bug.storedResult}`);
      });
      
      console.log('');
      console.log('🔧 Suggested Actions:');
      console.log('1. Re-run the pick evaluation for this game');
      console.log('2. Check if game scores were entered correctly');
      console.log('3. Verify which team was home/away');
      console.log(`4. Use the re-evaluation API: POST /api/admin/games/${game.id}/result`);
    } else {
      console.log('✅ All results appear correct according to the evaluation logic');
    }
    
  } catch (error) {
    console.error('Error debugging game:', error);
  } finally {
    await pool.end();
  }
}

// Update the connection details above and then run:
// node debug_nebraska_game.js
debugNebraskaGame();
