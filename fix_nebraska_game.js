#!/usr/bin/env node

// Script to find and fix the Nebraska vs Cincinnati game picks
// Run this from the root directory of your project

const { exec } = require('child_process');
const fs = require('fs');

// This script will help you identify and re-evaluate the Nebraska game
async function findAndFixNebraskaGame() {
  console.log('🔍 Finding Nebraska vs Cincinnati game with incorrect results...\n');
  
  // Step 1: Find games with Nebraska and Cincinnati
  console.log('Looking for games containing Nebraska and Cincinnati teams...');
  
  // You'll need to replace this with your actual database query command
  const gameSearchCommand = `
    # Replace this with your actual database query method
    # Example using psql:
    # psql -d your_database -t -c "
    #   SELECT g.id, g.home_team, g.away_team, g.home_score, g.away_score 
    #   FROM games g 
    #   WHERE (g.home_team LIKE '%Nebraska%' OR g.away_team LIKE '%Nebraska%') 
    #     AND (g.home_team LIKE '%Cincinnati%' OR g.away_team LIKE '%Cincinnati%')
    #     AND g.home_score IS NOT NULL 
    #     AND g.away_score IS NOT NULL
    #   ORDER BY g.created_at DESC 
    #   LIMIT 1;
    # "
    
    echo "You need to configure your database connection in this script"
    echo "Game ID will be needed for the next step"
  `;
  
  console.log('Manual steps to fix the Nebraska game:');
  console.log('=====================================\n');
  
  console.log('1. Find the game ID by running a database query:');
  console.log(`   SELECT g.id, g.home_team, g.away_team, g.home_score, g.away_score, g.spread_home`);
  console.log(`   FROM games g`);  
  console.log(`   WHERE (g.home_team LIKE '%Nebraska%' OR g.away_team LIKE '%Nebraska%')`);
  console.log(`     AND (g.home_team LIKE '%Cincinnati%' OR g.away_team LIKE '%Cincinnati%')`);
  console.log(`     AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL;`);
  console.log('');
  
  console.log('2. Verify the game details match:');
  console.log('   - Final Score: Nebraska 20, Cincinnati 17');
  console.log('   - Spread: Nebraska -6.5');
  console.log('   - Expected result: LOSS (Nebraska won by 3, needed 6.5+)');
  console.log('');
  
  console.log('3. Check current pick results:');
  console.log(`   SELECT p.id, p.user_id, p.pick_type, p.spread_value, p.result`);
  console.log(`   FROM picks p WHERE p.game_id = [GAME_ID_FROM_STEP_1];`);
  console.log('');
  
  console.log('4. Re-evaluate the game using your API:');
  console.log('   Method: POST');
  console.log('   URL: http://localhost:3000/api/admin/games/[GAME_ID]/result');
  console.log('   Headers: Authorization required for admin');
  console.log('');
  
  console.log('5. Or use curl:');
  console.log(`   curl -X POST \\`);
  console.log(`     "http://localhost:3000/api/admin/games/[GAME_ID]/result" \\`);
  console.log(`     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\`);
  console.log(`     -H "Content-Type: application/json"`);
  console.log('');
  
  console.log('Alternative approach - Direct database fix:');
  console.log('==========================================\n');
  
  console.log('If the API approach doesn\'t work, you can fix it directly:');
  console.log('');
  console.log('1. Find all Nebraska -6.5 picks for this game:');
  console.log(`   SELECT p.id FROM picks p`);
  console.log(`   JOIN games g ON p.game_id = g.id`);
  console.log(`   WHERE g.id = [GAME_ID]`);
  console.log(`     AND p.spread_value = -6.5`);
  console.log(`     AND p.result = 'win';  -- These should be 'loss'`);
  console.log('');
  
  console.log('2. Update the incorrect results:');
  console.log(`   UPDATE picks SET result = 'loss', evaluated_at = CURRENT_TIMESTAMP`);
  console.log(`   WHERE id IN ([LIST_OF_PICK_IDS_FROM_STEP_1]);`);
  console.log('');
  
  console.log('Debug information to verify the fix:');
  console.log('===================================\n');
  
  // Create a simple debug script
  const debugScript = `
// Debug script to verify the logic
const { evaluatePick } = require('./src/lib/pickEvaluation');

const mockPick = {
  id: 1,
  user_id: 'test',
  game_id: 1,
  pick_type: 'home_spread',  // If Nebraska was home
  spread_value: -6.5,
  submitted: true,
  is_triple_play: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Test both scenarios
console.log('=== DEBUGGING NEBRASKA EVALUATION ===');
console.log('Final Score: Nebraska 20, Cincinnati 17');
console.log('');

// Scenario 1: Nebraska is home team
console.log('Scenario 1: Nebraska is HOME team');
console.log('Pick: Nebraska -6.5 (home_spread)');
console.log('homeScore: 20, awayScore: 17');
const result1 = evaluatePick(mockPick, 20, 17);
console.log(\`Result: \${result1}\`);
console.log(\`Expected: loss (won by 3, needed 6.5+)\`);
console.log(\`Status: \${result1 === 'loss' ? '✅ CORRECT' : '❌ BUG'}\`);
console.log('');

// Scenario 2: Nebraska is away team  
const awayPick = { ...mockPick, pick_type: 'away_spread', spread_value: 6.5 };
console.log('Scenario 2: Nebraska is AWAY team');
console.log('Pick: Nebraska -6.5 (shown as away_spread 6.5)');
console.log('homeScore: 17, awayScore: 20');
const result2 = evaluatePick(awayPick, 17, 20);
console.log(\`Result: \${result2}\`);
console.log(\`Expected: loss (won by 3, needed 6.5+)\`);
console.log(\`Status: \${result2 === 'loss' ? '✅ CORRECT' : '❌ BUG'}\`);
`;

  fs.writeFileSync('debug_picks.js', debugScript);
  console.log('Created debug_picks.js - run with: node debug_picks.js');
  console.log('');
  
  console.log('📞 Need help? The issue is likely:');
  console.log('1. Wrong team assignment (home vs away)');
  console.log('2. Wrong score entry (maybe flipped scores)'); 
  console.log('3. Wrong spread value stored in picks');
  console.log('4. Old evaluation before correct scores were entered');
  console.log('');
  
  console.log('🔧 Quick fix: Use the re-evaluation API endpoint');
  console.log('This will recalculate all picks using the current scores and evaluation logic.');
}

findAndFixNebraskaGame();
