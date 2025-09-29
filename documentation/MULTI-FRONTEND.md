# Multi-Frontend AWS Application Accelerator

This project now supports **three frontend frameworks** that all connect to the same AWS backend infrastructure:

- **Vue 3** with Composition API and Tailwind CSS
- **React 18** with TypeScript and modern hooks
- **Angular 20** with TypeScript and RxJS

## 🏗️ Project Structure

```
frontend/
├── vue/                    # Vue 3 + Vite + TypeScript
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── views/          # Page views
│   │   ├── graphql/        # GraphQL client & queries
│   │   └── aws-exports.js  # AWS configuration
│   └── package.json
├── react/                  # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── graphql/        # GraphQL client & queries
│   │   └── aws-exports.js  # AWS configuration
│   └── package.json
└── angular/                # Angular 20 + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── components/ # Angular components
    │   │   └── services/   # GraphQL service
    │   └── aws-exports.js  # AWS configuration
    └── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies for All Frontends
```bash
npm run frontend:install:all
```

### 2. Start Individual Frontends

**Vue Frontend:**
```bash
npm run frontend:vue:dev
# Runs on http://localhost:3001
```

**React Frontend:**
```bash
npm run frontend:react:dev
# Runs on http://localhost:3002
```

**Angular Frontend:**
```bash
npm run frontend:angular:dev
# Runs on http://localhost:4200
```

## 🔧 Available Scripts

### Root Level Scripts
- `npm run frontend:install:all` - Install dependencies for all frontends
- `npm run frontend:vue:dev` - Start Vue development server
- `npm run frontend:vue:build` - Build Vue for production
- `npm run frontend:react:dev` - Start React development server
- `npm run frontend:react:build` - Build React for production
- `npm run frontend:angular:dev` - Start Angular development server
- `npm run frontend:angular:build` - Build Angular for production

### Individual Frontend Scripts
Each frontend has its own `package.json` with framework-specific scripts.

## 🎯 Framework-Specific Features

### Vue 3 Frontend
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Amplify UI Vue
- **State Management**: Reactive refs and computed
- **GraphQL**: Apollo Client with Vue integration
- **Authentication**: AWS Amplify UI Vue components

### React Frontend
- **Framework**: React 18 with hooks
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Amplify UI React
- **State Management**: React hooks and context
- **GraphQL**: Apollo Client with React hooks
- **Authentication**: AWS Amplify UI React components

### Angular Frontend
- **Framework**: Angular 20
- **Build Tool**: Angular CLI
- **Styling**: Angular Material (planned)
- **State Management**: RxJS and services
- **GraphQL**: Apollo Angular
- **Authentication**: AWS Amplify UI Angular

## 🔐 Authentication

All three frontends use **AWS Cognito** for authentication with framework-specific UI components:

- **Vue**: `@aws-amplify/ui-vue` Authenticator
- **React**: `@aws-amplify/ui-react` Authenticator  
- **Angular**: `@aws-amplify/ui-angular` Authenticator

## 📊 GraphQL Integration

Each frontend connects to the same **AWS AppSync GraphQL API** with:

- **Shared Schema**: User, Post, and GeoData models
- **Real-time Subscriptions**: Live updates across all frontends
- **Authentication**: JWT tokens from Cognito
- **Caching**: Apollo Client with framework-specific integrations

## 🐛 Debugging

### VS Code Debug Configurations

The project includes debug configurations for all three frontends:

1. **Debug Vue Frontend in Edge** - Port 3001
2. **Debug React Frontend in Edge** - Port 3002  
3. **Debug Angular Frontend in Edge** - Port 4200

### Starting Debug Sessions

1. Open VS Code
2. Go to Run and Debug panel (Ctrl+Shift+D)
3. Select your desired frontend configuration
4. Press F5 to start debugging

## 🌐 Ports and URLs

| Frontend | Development URL | Debug Port | Framework Default |
|----------|----------------|------------|-------------------|
| Vue      | http://localhost:3001 | 9222 | Vite (configured) |
| React    | http://localhost:3002 | 9223 | Vite (configured) |
| Angular  | http://localhost:4200 | 9224 | Angular CLI (default) |

## 📦 Dependencies

### Shared AWS Dependencies
All frontends use:
- `aws-amplify` - AWS SDK and authentication
- `@apollo/client` - GraphQL client
- `graphql` - GraphQL runtime

### Framework-Specific UI Libraries
- **Vue**: `@aws-amplify/ui-vue`
- **React**: `@aws-amplify/ui-react`
- **Angular**: `@aws-amplify/ui-angular`

## 🔄 Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vue 3     │    │   React 18  │    │  Angular 20 │
│ Frontend    │    │  Frontend   │    │  Frontend   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                ┌─────────────────────┐
                │   AWS AppSync       │
                │   GraphQL API       │
                └─────────────────────┘
                           │
                ┌─────────────────────┐
                │   AWS Backend       │
                │ • Cognito (Auth)    │
                │ • DynamoDB (Data)   │
                │ • Lambda (Logic)    │
                └─────────────────────┘
```

## 🎨 Styling Approaches

### Vue Frontend
- **Tailwind CSS** for utility-first styling
- **Amplify UI Vue** for authentication components
- **Custom CSS** for framework-specific styling

### React Frontend  
- **Tailwind CSS** for utility-first styling
- **Amplify UI React** for authentication components
- **CSS Modules** support available

### Angular Frontend
- **Angular Material** (to be implemented)
- **Amplify UI Angular** for authentication components
- **SCSS** support built-in

## 🚀 Deployment Options

### Development
All frontends run locally and connect to the deployed AWS backend.

### Production (Future)
Each frontend can be deployed to:
- **AWS S3 + CloudFront** for static hosting
- **AWS Amplify Hosting** for CI/CD integration
- **Vercel/Netlify** for alternative hosting

## 🔧 Configuration

### AWS Configuration
Each frontend has its own `aws-exports.js` file with identical AWS resource configurations:
- Cognito User Pool settings
- AppSync GraphQL endpoint
- Real-time subscription endpoints

### Environment Variables
Framework-specific environment files:
- **Vue**: `.env.development`, `.env.production`
- **React**: `.env.development`, `.env.production`
- **Angular**: `environment.ts`, `environment.prod.ts`

## 📚 Framework Documentation

- [Vue 3 Documentation](https://vuejs.org/)
- [React Documentation](https://react.dev/)
- [Angular Documentation](https://angular.io/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Apollo GraphQL Documentation](https://www.apollographql.com/docs/)

## 🤝 Contributing

When adding features:
1. Implement in your preferred frontend first
2. Consider porting to other frontends for consistency
3. Update this documentation
4. Test all three frontends with the shared backend

## 🎯 Next Steps

1. **Install dependencies**: `npm run frontend:install:all`
2. **Choose your framework**: Start with Vue, React, or Angular
3. **Start developing**: Use the debug configurations for the best experience
4. **Test across frameworks**: Ensure features work consistently

---

**Choose your frontend framework and start building! All three connect to the same powerful AWS backend.** 🚀
