# Smart Rental Tracking System

A full-stack equipment rental intelligence platform designed to help rental operations teams monitor fleet activity, predict maintenance requirements, forecast equipment demand, and identify operational risks from telemetry and rental data.

## Overview

The Smart Rental Tracking System combines real-time-style equipment telemetry, rental operations, machine learning predictions, demand forecasting, and operational alerts into a unified dashboard.

The system is designed around four core operational questions:

- **Where is the equipment and how is it being used?**
- **Which equipment requires maintenance?**
- **What equipment will be in demand at a given site?**
- **Which rental or equipment conditions require attention?**

## Key Features

### Fleet Dashboard
- Fleet-wide equipment overview
- Engine state monitoring
- Equipment utilization tracking
- Rental status monitoring
- Current equipment location
- Fleet health indicators
- Recent telemetry
- Operational metrics
- ML-powered maintenance insights

### Equipment Monitoring
- Search equipment by ID
- View equipment specifications
- Monitor latest telemetry
- Engine hours and operating hours
- Utilization percentage
- Maintenance status
- Fuel efficiency
- Equipment location
- Historical telemetry

### Rental Management
- Complete rental inventory
- Rental search and filtering
- Pagination
- Rental details
- Checkout and expected return times
- Actual check-in tracking
- Planned vs actual rental duration
- Official rental status
- Automatic return-timing analysis

### Predictive Maintenance
The system uses a trained Random Forest classification model to predict equipment maintenance status from telemetry data.

Current model inputs:

- Engine hours
- Operating hours
- Utilization percentage

The prediction service provides:

- Predicted maintenance status
- Prediction confidence
- Anomaly prediction
- Risk classification
- Recommended operational action

### Demand Forecasting
The system predicts equipment demand for a specific site, equipment model, and date.

The demand model uses:

- Day of week
- Weekend indicator
- Month
- Day of year
- Historical demand lags
- Rolling demand averages
- Site encoding
- Equipment model encoding

The forecasting interface provides:

- Selected-day demand prediction
- Demand level
- Seven-day demand outlook
- Demand visualization
- Site and equipment context
- Operational interpretation

### Operational Alerts
The alert system identifies conditions requiring attention, including:

- Late rentals
- Overdue ongoing rentals
- Critical maintenance states
- Service-due conditions
- Injected telemetry anomalies
- Excessive equipment utilization

Alerts are categorized by operational severity.

## System Architecture

```text
                    ┌─────────────────────────┐
                    │      React Frontend     │
                    │      TypeScript/Vite    │
                    └────────────┬────────────┘
                                 │
                                 │ REST API
                                 ▼
                    ┌─────────────────────────┐
                    │      FastAPI Backend    │
                    │                         │
                    │  Equipment Management   │
                    │  Rental Management      │
                    │  Telemetry Processing   │
                    │  ML Prediction APIs     │
                    │  Demand Forecast API    │
                    └───────┬─────────┬───────┘
                            │         │
                ┌───────────┘         └────────────┐
                ▼                                  ▼
       ┌─────────────────┐               ┌─────────────────┐
       │ SQLite Database │               │ Machine Learning│
       │                 │               │ Models          │
       │ Equipment       │               │                 │
       │ Rentals         │               │ Maintenance     │
       │ Telemetry       │               │ Demand          │
       │ Predictions     │               │                 │
       └─────────────────┘               └─────────────────┘
