// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Weather data cache
let weatherCache = null;
let weatherCacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Fetch weather data from Open-Meteo (Des Moines, Iowa - corn belt)
async function getWeatherData() {
  // Return cached data if still valid
  if (weatherCache && weatherCacheTime && Date.now() - weatherCacheTime < CACHE_DURATION) {
    return weatherCache;
  }

  try {
    // Des Moines, Iowa coordinates: 41.6005, -93.6091
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: 41.6005,
        longitude: -93.6091,
        current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
        temperature_unit: 'fahrenheit',
        timezone: 'America/Chicago'
      }
    });

    weatherCache = {
      temperature: response.data.current.temperature_2m,
      humidity: response.data.current.relative_humidity_2m,
      precipitation: response.data.current.precipitation,
      weatherCode: response.data.current.weather_code,
      location: 'Des Moines, Iowa'
    };
    weatherCacheTime = Date.now();

    return weatherCache;
  } catch (error) {
    console.error('Weather API error:', error.message);
    return null;
  }
}

// Calculate weather stress factor (affects crop prices)
function calculateWeatherStress(weather) {
  if (!weather) return 1.0; // No adjustment if no weather data

  let stressFactor = 1.0;

  // Temperature stress (optimal corn temp: 70-85°F)
  if (weather.temperature < 60 || weather.temperature > 95) {
    stressFactor *= 1.08; // 8% price increase for extreme temps
  } else if (weather.temperature < 70 || weather.temperature > 85) {
    stressFactor *= 1.03; // 3% price increase for suboptimal temps
  }

  // Humidity stress (optimal: 50-70%)
  if (weather.humidity < 40 || weather.humidity > 80) {
    stressFactor *= 1.05; // 5% price increase for extreme humidity
  }

  // Precipitation stress (drought or flooding)
  if (weather.precipitation > 0.5) {
    stressFactor *= 1.06; // 6% price increase for heavy rain
  }

  return stressFactor;
}

// Linear Regression Forecast Function
async function calculateForecast(data) {
  const n = data.length;
  const prices = data.map(d => d.price);
  
  // Calculate linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Base forecast from linear regression
  let nextPrice = slope * n + intercept;
  
  // Get weather data and adjust forecast
  const weather = await getWeatherData();
  const weatherStress = calculateWeatherStress(weather);
  nextPrice = nextPrice * weatherStress;
  
  // Calculate trend strength (R-squared for confidence)
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += Math.pow(prices[i] - predicted, 2);
    ssTot += Math.pow(prices[i] - meanY, 2);
  }
  
  const rSquared = 1 - (ssRes / ssTot);
  const confidence = Math.round(Math.abs(rSquared) * 100);
  
  // Determine trend
  const trend = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
  
  return {
    nextPrice: Math.max(0, nextPrice),
    trend: trend,
    confidence: confidence,
    weather: weather,
    weatherImpact: ((weatherStress - 1) * 100).toFixed(1) // Percentage impact
  };
}

// Real price data from USDA (prices in $/bushel)
const realPriceData = {
  corn: [
    { date: '2024-01', price: 4.74 },
    { date: '2024-02', price: 4.36 },
    { date: '2024-03', price: 4.36 },
    { date: '2024-04', price: 4.39 },
    { date: '2024-05', price: 4.51 },
    { date: '2024-06', price: 4.48 },
    { date: '2024-07', price: 4.23 },
    { date: '2024-08', price: 3.84 },
    { date: '2024-09', price: 3.97 },
    { date: '2024-10', price: 3.99 },
    { date: '2024-11', price: 4.07 },
    { date: '2024-12', price: 4.23 },
    { date: '2025-01', price: 4.29 },
    { date: '2025-02', price: 4.58 },
    { date: '2025-03', price: 4.57 },
    { date: '2025-04', price: 4.62 },
    { date: '2025-05', price: 4.64 },
    { date: '2025-06', price: 4.47 },
    { date: '2025-07', price: 4.29 },
    { date: '2025-08', price: 3.96 },
  ],
  wheat: [
    { date: '2024-01', price: 6.77 },
    { date: '2024-02', price: 6.34 },
    { date: '2024-03', price: 6.01 },
    { date: '2024-04', price: 5.90 },
    { date: '2024-05', price: 6.19 },
    { date: '2024-06', price: 5.86 },
    { date: '2024-07', price: 5.52 },
    { date: '2024-08', price: 5.23 },
    { date: '2024-09', price: 5.36 },
    { date: '2024-10', price: 5.47 },
    { date: '2024-11', price: 5.45 },
    { date: '2024-12', price: 5.49 },
    { date: '2025-01', price: 5.52 },
    { date: '2025-02', price: 5.59 },
    { date: '2025-03', price: 5.71 },
    { date: '2025-04', price: 5.61 },
    { date: '2025-05', price: 5.58 },
    { date: '2025-06', price: 5.28 },
    { date: '2025-07', price: 4.94 },
    { date: '2025-08', price: 4.84 },
  ],
  soybean: [
    { date: '2024-01', price: 12.80 },
    { date: '2024-02', price: 11.90 },
    { date: '2024-03', price: 11.80 },
    { date: '2024-04', price: 11.80 },
    { date: '2024-05', price: 11.90 },
    { date: '2024-06', price: 11.80 },
    { date: '2024-07', price: 11.30 },
    { date: '2024-08', price: 10.30 },
    { date: '2024-09', price: 10.20 },
    { date: '2024-10', price: 9.91 },
    { date: '2024-11', price: 9.84 },
    { date: '2024-12', price: 9.79 },
    { date: '2025-01', price: 10.00 },
    { date: '2025-02', price: 10.20 },
    { date: '2025-03', price: 10.20 },
    { date: '2025-04', price: 10.20 },
    { date: '2025-05', price: 10.40 },
    { date: '2025-06', price: 10.40 },
    { date: '2025-07', price: 10.20 },
    { date: '2025-08', price: 10.00 },
  ],
  cotton: [
    { date: '2024-01', price: 0.767 },
    { date: '2024-02', price: 0.781 },
    { date: '2024-03', price: 0.829 },
    { date: '2024-04', price: 0.822 },
    { date: '2024-05', price: 0.847 },
    { date: '2024-06', price: 0.835 },
    { date: '2024-07', price: 0.865 },
    { date: '2024-08', price: 0.564 },
    { date: '2024-09', price: 0.598 },
    { date: '2024-10', price: 0.636 },
    { date: '2024-11', price: 0.655 },
    { date: '2024-12', price: 0.625 },
    { date: '2025-01', price: 0.620 },
    { date: '2025-02', price: 0.629 },
    { date: '2025-03', price: 0.619 },
    { date: '2025-04', price: 0.639 },
    { date: '2025-05', price: 0.641 },
    { date: '2025-06', price: 0.623 },
    { date: '2025-07', price: 0.666 },
    { date: '2025-08', price: 0.571 },
  ],
};

// API endpoint to get price data for a specific produce
app.get('/api/prices/:produce', async (req, res) => {
  const { produce } = req.params;
  const data = realPriceData[produce.toLowerCase()];

  if (!data) {
    return res.status(404).json({ error: 'Produce not found' });
  }

  // Calculate forecast using linear regression and weather
  const forecast = await calculateForecast(data);
  const currentPrice = data[data.length - 1].price;
  const priceChange = ((forecast.nextPrice - currentPrice) / currentPrice * 100).toFixed(1);

  // Generate recommendation (farmer-focused)
  let recommendation = '';
  if (forecast.nextPrice < currentPrice * 0.98) {
    recommendation = 'Prices expected to drop significantly - consider selling now or delaying harvest';
  } else if (forecast.nextPrice < currentPrice) {
    recommendation = 'Prices expected to drop slightly - good time to sell current inventory';
  } else if (forecast.nextPrice > currentPrice * 1.02) {
    recommendation = 'Prices expected to rise significantly - hold inventory if possible';
  } else if (forecast.nextPrice > currentPrice) {
    recommendation = 'Prices expected to rise slightly - consider holding for better prices';
  } else {
    recommendation = 'Prices expected to stay stable - normal market conditions';
  }

  res.json({
    produce,
    history: data,
    currentPrice: currentPrice,
    forecastedPrice: forecast.nextPrice.toFixed(2),
    priceChange: priceChange,
    trend: forecast.trend,
    confidence: forecast.confidence,
    recommendation: recommendation,
    weather: forecast.weather,
    weatherImpact: forecast.weatherImpact
  });
});

// API endpoint to get all available produces
app.get('/api/produces', (req, res) => {
  res.json({
    produces: Object.keys(realPriceData),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

app.listen(PORT, () => {
  console.log(`🌱 FutureCrop++ Backend running on http://localhost:${PORT}`);
});