import axios from 'axios';

var exchangeRates: { [key: string]: number } = {
  'South Africa': 2553.01,
  'United States': 142.20,
  'United Kingdom': 108.80,
  'European Union': 129.23,
  'Japan': 20864.23,
  'China': 1042.83,
  'India': 11961.83,
};

export class CurrencyConverter {
  // run fetchCurrentExchangeRates() when its playlist loaded

  static async getSelectedCountry(): Promise<string> {
    try {
      const response = await fetch('/selectedFlag.txt');
      if (!response.ok) {
        throw new Error('Failed to fetch selected country');
      }
      const countryName = await response.text();
      return countryName.trim();
    } catch (error) {
      console.error('Error reading selected country:', error);
      return 'South Africa'; // Default to South Africa
    }
  }

  static async convertSolToCurrency(solAmount: number): Promise<number | null> {
    const countryName = await this.getSelectedCountry();
    const rate = exchangeRates[countryName];
    if (rate === undefined) {
      console.error(`Conversion rate for ${countryName} not found`);
      return null;
    }
    return solAmount * rate;
  }

  static async getCurrencySymbol(): Promise<string> {
    const countryName = await this.getSelectedCountry();
    switch (countryName) {
      case 'South Africa':
        return 'R';
      case 'United States':
        return '$';
      case 'United Kingdom':
        return '£';
      case 'European Union':
        return '€';
      case 'Japan':
        return '¥';
      case 'China':
        return '¥';
      case 'India':
        return '₹';
      default:
        return 'R';
    }
  }

  static async getCurrencyKey(): Promise<string> {
    const countryName = await this.getSelectedCountry();
    switch (countryName) {
      case 'South Africa':
        return 'zar';
      case 'United States':
        return 'usd';
      case 'United Kingdom':
        return 'gbp';
      case 'European Union':
        return 'eur';
      case 'Japan':
        return 'jpy';
      case 'China':
        return 'cny';
      case 'India':
        return 'inr';
      default:
        return 'zar';
    }
  }

  static async convertCurrencyToSol(currencyAmount: number): Promise<number | null> {
    const countryName = await this.getSelectedCountry();
    const rate = exchangeRates[countryName];
    if (rate === undefined) {
      console.error(`Conversion rate for ${countryName} not found`);
      return null;
    }
    return currencyAmount / rate;
  }

  static async getExchangeRate(): Promise<number | undefined> {
    const countryName = await this.getSelectedCountry();
    return exchangeRates[countryName];
  }

  static async fetchCurrentExchangeRates() {
    try {
      const currencyKeys = await Promise.all(
        Object.keys(exchangeRates).map(async (country) => {
          return await this.getCurrencyKeyByCountry(country);
        })
      );

      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'solana',
            vs_currencies: currencyKeys.join(','),
          },
        }
      );

      Object.keys(exchangeRates).forEach(async (country) => {
        const key = await this.getCurrencyKeyByCountry(country);
        const rate = response.data.solana[key];
        if (rate) {
          exchangeRates[country] = rate;
        }
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  }

  static async getCurrencyKeyByCountry(country: string): Promise<string> {
    switch (country) {
      case 'South Africa':
        return 'zar';
      case 'United States':
        return 'usd';
      case 'United Kingdom':
        return 'gbp';
      case 'European Union':
        return 'eur';
      case 'Japan':
        return 'jpy';
      case 'China':
        return 'cny';
      case 'India':
        return 'inr';
      default:
        return 'zar';
    }
  }
}
