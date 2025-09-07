/**
 * Script to test other games from this week that had incorrect evaluations
 * 
 * Usage: Tell me the game details and I'll add them here for testing
 */

import { evaluatePick } from './src/lib/pickEvaluation';
import { Pick } from './src/types/pick';

interface GameTestCase {
  description: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  picks: {
    pickId: number;
    pickType: 'home_spread' | 'away_spread';
    spreadValue: number;
    expectedResult: 'win' | 'loss' | 'push';
    description: string;
  }[];
}

const testCases: GameTestCase[] = [
  // Add your other problematic games here
  {
    description: "Ole Miss 30 @ Kentucky 23 (Ole Miss won by 7)",
    homeTeam: "Kentucky Wildcats",
    awayTeam: "Ole Miss Rebels", 
    homeScore: 23,
    awayScore: 30,
    picks: [
      {
        pickId: 106,
        pickType: 'away_spread',
        spreadValue: -9.5,
        expectedResult: 'loss',
        description: 'Ole Miss -9.5 (should be LOSS - won by 7, needed 10+)'
      },
      {
        pickId: 81,
        pickType: 'away_spread',
        spreadValue: -10.5,
        expectedResult: 'loss',
        description: 'Ole Miss -10.5 (should be LOSS - won by 7, needed 11+)'
      },
      {
        pickId: 102,
        pickType: 'away_spread',
        spreadValue: -10.5,
        expectedResult: 'loss',
        description: 'Ole Miss -10.5 (should be LOSS - won by 7, needed 11+)'
      }
    ]
  },
  {
    description: "Arizona State 20 @ Mississippi State 24 (Arizona State lost by 4)",
    homeTeam: "Mississippi State",
    awayTeam: "Arizona State",
    homeScore: 24,
    awayScore: 20,
    picks: [
      {
        pickId: 999, // Replace with actual pick ID if you know it
        pickType: 'away_spread',
        spreadValue: -6.5,
        expectedResult: 'loss',
        description: 'Arizona State -6.5 (should be LOSS - lost by 4, needed to win by 7+)'
      }
    ]
  }
  // ADD OTHER GAMES HERE - format:
  // {
  //   description: "Team A vs Team B description",
  //   homeTeam: "Home Team Name",
  //   awayTeam: "Away Team Name",
  //   homeScore: 0,
  //   awayScore: 0,
  //   picks: [
  //     {
  //       pickId: 999,
  //       pickType: 'away_spread',
  //       spreadValue: -7.5,
  //       expectedResult: 'loss',
  //       description: 'Description of what should happen'
  //     }
  //   ]
  // }
];

function runTests() {
  console.log('🧪 Testing other games with potentially incorrect evaluations\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, gameIndex) => {
    console.log(`🎮 Game ${gameIndex + 1}: ${testCase.description}`);
    console.log(`   Final Score: ${testCase.awayTeam} ${testCase.awayScore} @ ${testCase.homeTeam} ${testCase.homeScore}`);
    console.log('');
    
    testCase.picks.forEach((pickTest, pickIndex) => {
      totalTests++;
      
      const pick: Pick = {
        id: pickTest.pickId,
        user_id: 'test-user',
        game_id: gameIndex + 1,
        pick_type: pickTest.pickType,
        spread_value: pickTest.spreadValue,
        submitted: true,
        is_triple_play: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const actualResult = evaluatePick(pick, testCase.homeScore, testCase.awayScore);
      const isCorrect = actualResult === pickTest.expectedResult;
      
      const status = isCorrect ? '✅ PASS' : '❌ FAIL';
      const team = pickTest.pickType === 'home_spread' ? testCase.homeTeam : testCase.awayTeam;
      const spreadDisplay = pickTest.spreadValue > 0 ? `+${pickTest.spreadValue}` : `${pickTest.spreadValue}`;
      
      console.log(`   ${status} Pick ${pickTest.pickId}: ${team} ${spreadDisplay}`);
      console.log(`        Expected: ${pickTest.expectedResult} | Actual: ${actualResult}`);
      console.log(`        ${pickTest.description}`);
      
      if (isCorrect) {
        passedTests++;
      } else {
        failedTests++;
        console.log(`        ⚠️  This pick needs manual correction in the database!`);
      }
      console.log('');
    });
    
    console.log('---');
  });
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log(`\n🚨 ${failedTests} picks need manual correction in the database.`);
    console.log(`   Use the re-evaluation API or run SQL updates to fix these.`);
  } else {
    console.log(`\n🎉 All tests passed! The evaluation logic is working correctly.`);
  }
}

// Run the tests
runTests();
