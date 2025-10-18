# FutureCrop++ 🌾

An agricultural price forecasting dashboard that helps farmers make informed decisions about crop sales and harvest timing using real USDA data and weather integration.

![FutureCrop++ Dashboard](https://via.placeholder.com/800x400?text=FutureCrop%2B%2B+Dashboard)

## 🎯 Features

- **Real-Time Price Forecasting** — Predicts future commodity prices using linear regression on historical USDA data  
- **Weather Integration** — Incorporates current weather conditions from Iowa's corn belt to adjust price predictions  
- **Market Advisory** — Actionable recommendations for selling strategy and harvest timing  
- **Multiple Commodities** — Corn, wheat, soybeans, and cotton  
- **Interactive Visualizations** — Clean, professional charts showing price trends and forecasts  
- **Confidence Metrics** — Forecast reliability based on historical trend strength (R² metric)

## 🛠️ Tech Stack

**Frontend**
- React.js  
- Recharts (data visualization)  
- CSS3 (custom styling)

**Backend**
- Node.js  
- Express.js  
- Axios (API requests)

**Data Sources**
- USDA National Agricultural Statistics Service (Prices Received by Farmers)  
- Open-Meteo Weather API  

## 📊 Supported Commodities

| Commodity | Unit     | Price Range |
|-----------|----------|-------------|
| Corn      | $/bushel | $4–5        |
| Wheat     | $/bushel | $5–7        |
| Soybeans  | $/bushel | $10–13      |
| Cotton    | $/lb     | $0.60–0.87  |

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jcshyy/futurecrop-plus-plus.git
   cd futurecrop-plus-plus
