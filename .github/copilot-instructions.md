# Wevy MVP - Ionic Angular Capacitor Project

## Project Overview
Wevy is a meal decision app for couples, roommates, and families. The MVP focuses on solving the daily question: "What are we eating tonight?"

## Tech Stack
- **Framework**: Ionic 7+ with Angular 17+
- **Mobile**: Capacitor 5+
- **Backend**: Supabase (Auth + Database + Storage)
- **Push Notifications**: Firebase Cloud Messaging
- **Language**: TypeScript

## Project Structure
```
src/
├── app/
│   ├── core/           # Core services and guards
│   ├── shared/         # Shared components and utilities
│   ├── models/         # Data models and interfaces
│   ├── services/       # Business logic services
│   └── pages/          # Application pages
│       ├── home/       # Swipe interface
│       ├── library/    # Recipe library
│       ├── shopping/   # Shopping list
│       ├── add-recipe/ # Add recipe form
│       └── profile/    # User profile
```

## Key Features
1. **Recipe Management**: Add from TikTok/Instagram/URL or manually
2. **Swipe Matching**: All household members swipe to match on meals
3. **Shopping List**: Auto-generated from selected recipes
4. **Shared Library**: Accessible to all household members
5. **Recipe Filtering**: By time, difficulty, tools needed

## Development Guidelines
- Use Ionic components for UI consistency
- Follow Angular best practices (standalone components, signals)
- Implement reactive programming with RxJS
- Use Capacitor plugins for native features
- Supabase for real-time data synchronization
- Mobile-first responsive design

## Code Style
- Use TypeScript strict mode
- Follow Angular style guide
- Use async/await for async operations
- Implement proper error handling
- Add JSDoc comments for complex logic

## MVP Scope
Focus on core meal decision flow:
1. Add recipes to shared library
2. Daily swipe session for meal selection
3. Generate shopping list from matched recipe
4. View recipe history

Secondary features for post-MVP:
- Push notifications
- Recipe notes and modifications
- Favorites system
- Weekly meal planning
