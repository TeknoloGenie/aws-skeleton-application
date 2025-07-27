import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import apolloClient from './graphql/client';
import awsExports from './aws-exports.js';
import Dashboard from './components/Dashboard';
import Posts from './components/Posts';
import Users from './components/Users';
import Navigation from './components/Navigation';

// Configure Amplify
Amplify.configure(awsExports);

// Custom form fields for sign up
const formFields = {
  signUp: {
    email: {
      order: 1,
      placeholder: 'Enter your email address',
      label: 'Email *',
      inputProps: { required: true },
    },
    given_name: {
      order: 2,
      placeholder: 'Enter your first name',
      label: 'First Name *',
      inputProps: { required: true },
    },
    family_name: {
      order: 3,
      placeholder: 'Enter your last name', 
      label: 'Last Name *',
      inputProps: { required: true },
    },
    password: {
      order: 4,
      placeholder: 'Enter your password',
      label: 'Password *',
      inputProps: { required: true },
    },
    confirm_password: {
      order: 5,
      placeholder: 'Confirm your password',
      label: 'Confirm Password *',
      inputProps: { required: true },
    },
  },
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ApolloProvider client={apolloClient}>
        <Authenticator formFields={formFields}>
          {({ signOut, user }) => (
            <Router>
              <Navigation user={user} signOut={signOut} />
              
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/users" element={<Users />} />
                </Routes>
              </main>
            </Router>
          )}
        </Authenticator>
      </ApolloProvider>
    </div>
  );
};

export default App;
