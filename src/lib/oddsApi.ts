import { OddsApiEvent, SUPPORTED_SPORTS, SupportedSport } from '../types/game';

type BookmakerData = NonNullable<OddsApiEvent['bookmakers']>[0];
type MarketOutcome = BookmakerData['markets'][0]['outcomes'][0];

interface OddsData {
  spread_home?: number;
  spread_away?: number;
  total_over_under?: number;
  moneyline_home?: number;
  moneyline_away?: number;
}

interface TransformedGameData {
  week_id: number;
  sport: SupportedSport;
  external_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  spread_home?: number;
  spread_away?: number;
  total_over_under?: number;
  moneyline_home?: number;
  moneyline_away?: number;
  bookmaker: string;
  odds_last_updated: string;
}

// Configuration
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

if (!API_KEY) {
  console.warn('ODDS_API_KEY not found in environment variables');
}

interface OddsApiParams {
  regions?: string; // 'us' for US books
  markets?: string; // 'h2h,spreads,totals' for moneyline, spreads, and totals
  bookmakers?: string; // Comma-separated list of bookmaker keys
  oddsFormat?: string; // 'american' for American odds
  dateFormat?: string; // 'iso' for ISO 8601 format
  commenceTimeFrom?: string; // ISO date string for filtering games
  commenceTimeTo?: string; // ISO date string for filtering games
}

class OddsApiService {
  private baseUrl = ODDS_API_BASE_URL;
  private apiKey = API_KEY;

  /**
   * Fetch available sports from The Odds API
   */
  async getSports(): Promise<Array<{ key: string; title: string; description: string }>> {
    try {
      const url = `${this.baseUrl}/sports?apiKey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sports:', error);
      throw new Error('Failed to fetch available sports');
    }
  }

  /**
   * Fetch games for a specific sport within a date range
   */
  async getGamesForSport(
    sport: SupportedSport,
    startDate: string,
    endDate: string
  ): Promise<OddsApiEvent[]> {
    try {
      // Ensure dates are in proper ISO format (YYYY-MM-DDTHH:MM:SSZ)
      const formatDateForAPI = (dateStr: string): string => {
        const date = new Date(dateStr);
        // Remove milliseconds to match API expected format
        return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
      };

      const params: OddsApiParams = {
        regions: 'us',
        markets: 'spreads',
        bookmakers: 'fanduel',
        oddsFormat: 'american',
        dateFormat: 'iso',
        commenceTimeFrom: formatDateForAPI(startDate),
        commenceTimeTo: formatDateForAPI(endDate)
      };

      const queryString = new URLSearchParams({
        apiKey: this.apiKey!,
        ...params
      }).toString();

      const url = `${this.baseUrl}/sports/${sport}/odds?${queryString}`;
      console.log(`Fetching ${sport} games from:`, url);
      console.log('Date range:', { 
        original: { startDate, endDate },
        formatted: { 
          commenceTimeFrom: params.commenceTimeFrom, 
          commenceTimeTo: params.commenceTimeTo 
        }
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for ${sport}:`, response.status, response.statusText, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check rate limiting headers
      const requestsRemaining = response.headers.get('x-requests-remaining');
      if (requestsRemaining) {
        console.log(`Odds API requests remaining: ${requestsRemaining}`);
      }
      
      const data = await response.json();
      console.log(`${sport} API response:`, {
        count: data?.length || 0,
        firstGame: data?.[0] ? {
          id: data[0].id,
          sport_title: data[0].sport_title,
          commence_time: data[0].commence_time,
          home_team: data[0].home_team,
          away_team: data[0].away_team,
          bookmakers_count: data[0].bookmakers?.length || 0,
          bookmakers: data[0].bookmakers?.map((b: BookmakerData) => b.key) || []
        } : null
      });
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      throw new Error(`Failed to fetch ${sport} games`);
    }
  }

  /**
   * Fetch NFL games for a date range
   */
  async getNFLGames(startDate: string, endDate: string): Promise<OddsApiEvent[]> {
    return this.getGamesForSport(SUPPORTED_SPORTS.NFL, startDate, endDate);
  }

  /**
   * Fetch college football games for a date range
   */
  async getCollegeGames(startDate: string, endDate: string): Promise<OddsApiEvent[]> {
    return this.getGamesForSport(SUPPORTED_SPORTS.COLLEGE, startDate, endDate);
  }

  /**
   * Fetch all football games (NFL + College) for a date range
   */
  async getAllFootballGames(startDate: string, endDate: string): Promise<{
    nfl: OddsApiEvent[];
    college: OddsApiEvent[];
  }> {
    try {
      const [nflGames, collegeGames] = await Promise.all([
        this.getNFLGames(startDate, endDate),
        this.getCollegeGames(startDate, endDate)
      ]);

      return {
        nfl: nflGames,
        college: collegeGames
      };
    } catch (error) {
      console.error('Error fetching all football games:', error);
      throw new Error('Failed to fetch football games');
    }
  }

  /**
   * Transform odds API data to our game format for storage
   */
  transformToGameData(event: OddsApiEvent, weekId: number): TransformedGameData {
    // Find the best odds from available bookmakers
    const bestOdds = this.extractBestOdds(event.bookmakers || [], event);
    
    return {
      week_id: weekId,
      sport: event.sport_key as SupportedSport,
      external_id: event.id,
      home_team: event.home_team,
      away_team: event.away_team,
      commence_time: event.commence_time,
      spread_home: bestOdds.odds.spread_home,
      spread_away: bestOdds.odds.spread_away,
      total_over_under: bestOdds.odds.total_over_under,
      moneyline_home: bestOdds.odds.moneyline_home,
      moneyline_away: bestOdds.odds.moneyline_away,
      bookmaker: bestOdds.bookmaker,
      odds_last_updated: bestOdds.lastUpdate
    };
  }

  /**
   * Extract the best odds from multiple bookmakers
   */
  private extractBestOdds(bookmakers: BookmakerData[], event: OddsApiEvent): { odds: OddsData; bookmaker: string; lastUpdate: string } {
    const bestOdds = {
      odds: {} as OddsData,
      bookmaker: '',
      lastUpdate: ''
    };

    if (bookmakers.length === 0) {
      return bestOdds;
    }

    // Use the first bookmaker for now (in production, you might want to pick the best odds)
    const bookmaker = bookmakers[0];
    bestOdds.bookmaker = bookmaker.title;
    bestOdds.lastUpdate = bookmaker.last_update;

    // Extract different market types
    for (const market of bookmaker.markets || []) {
      switch (market.key) {
        case 'h2h': // Moneyline
          const homeMoneyline = market.outcomes.find((o: MarketOutcome) => o.name === event.home_team);
          const awayMoneyline = market.outcomes.find((o: MarketOutcome) => o.name === event.away_team);
          if (homeMoneyline) bestOdds.odds.moneyline_home = homeMoneyline.price;
          if (awayMoneyline) bestOdds.odds.moneyline_away = awayMoneyline.price;
          break;
          
        case 'spreads': // Point spreads
          const homeSpread = market.outcomes.find((o: MarketOutcome) => o.name === event.home_team);
          const awaySpread = market.outcomes.find((o: MarketOutcome) => o.name === event.away_team);
          console.log('Spread extraction:', {
            market_outcomes: market.outcomes,
            home_team: event.home_team,
            away_team: event.away_team,
            homeSpread: homeSpread,
            awaySpread: awaySpread
          });
          if (homeSpread && homeSpread.point !== undefined) {
            bestOdds.odds.spread_home = homeSpread.point;
          }
          if (awaySpread && awaySpread.point !== undefined) {
            bestOdds.odds.spread_away = awaySpread.point;
          }
          break;
          
        case 'totals': // Over/Under
          const total = market.outcomes.find((o: MarketOutcome) => o.name === 'Over');
          if (total && total.point !== undefined) {
            bestOdds.odds.total_over_under = total.point;
          }
          break;
      }
    }

    return bestOdds;
  }
}

export const oddsApiService = new OddsApiService();