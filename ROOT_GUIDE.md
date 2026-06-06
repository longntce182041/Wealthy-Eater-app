# Wealthy Eater - Root Guide

## 1. Project Overview

Wealthy Eater is a comprehensive HealthTech platform connecting individuals with certified nutritionists. It automates personalized meal planning (respecting dietary constraints) via AI and processes meal images for macro tracking, while facilitating expert consultations.

## 2. Tech Stack & Multi-repo Structure

- **Mobile Frontend**: Flutter (`wealthy_eater_mobile/`)
- **Web Admin Frontend**: React / Next.js (`wealthy-eater-admin/`)
- **Backend Core API**: Node.js / Express (`wealthy_eater_backend/`)
- **AI Service**: Python / FastAPI (`wealthy-eater-ai/`)
- **Database**: MongoDB
- **Integrations**: Google Gemini API, n8n workflows, PayOS

## 3. Dev Commands

- **Backend (`wealthy_eater_backend`)**: `npm install` -> `npm run dev`
- **Mobile (`wealthy_eater_mobile`)**: `flutter pub get` -> `flutter run`
- **Admin (`wealthy-eater-admin`)**: `npm install` -> `npm run dev`
- **AI Service (`wealthy-eater-ai`)**: `pip install -r requirements.txt` -> `uvicorn app.main:app --reload` (or respective start script)

## 4. Core Logic Summary

- **Biometrics**: Computes core metrics (BMI, BMR, TDEE) to drive nutrition logic.
- **AI Meal Generation**: Uses Google Gemini via n8n workflows. Strict enforcement of calorie targets and user allergies.
- **Consultation Payments**: PayOS handles the booking flow. Success webhooks trigger booking confirmations.

## 5. Key Constraints

- **Multi-repo Boundaries**: Strictly maintain separation of concerns. Do not mix frontend logic with backend or AI service logic.
- **Environment Variables**: NEVER commit `.env` files. Secrets must remain localized.
- **Data Contracts**: Standardize all API responses across the Node.js and Python services.
- **AI Constraints**: AI generation MUST respect defined allergies and TDEE constraints.

## 6. Naming Conventions & API Routing

To maintain a clean separation of concerns and avoid route conflicts, all API routes and controller/service files MUST be prefixed by the target actor (`admin`, `user`, or `nutritionist`).

- **API Routes**: 
  - `/api/user/...` for customer/user actions (e.g., `/api/user/recipes`).
  - `/api/admin/...` for administrative actions (e.g., `/api/admin/ingredients`).
  - `/api/nutritionist/...` for nutritionist-specific actions.
  - *Exception:* `/api/auth/...` remains shared for authentication across all actors.
- **File Naming**: Controllers, services, and route files must be prefixed by the actor domain when the feature is actor-specific.
  - Examples: `user.recipe.controller.js`, `admin.ingredient.routes.js`.

## 7. Additional Documentation

Detailed technical specifications reside in the `docs/` folder:

- [State Management](docs/state_management.md)
- [AI Meal Generation Logic](docs/ai_meal_generation_logic.md)
- [Database Schema](docs/database_schema.md)
- [PayOS Webhook Flow](docs/payos_webhook_flow.md)
