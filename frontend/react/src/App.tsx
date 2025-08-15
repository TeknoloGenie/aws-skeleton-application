import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import apolloClient from './graphql/client';
import awsExports from './aws-exports.js';
import Dashboard from './components/Dashboard';
import Posts from './components/Posts';
import Users from './components/Users';
import AdminDashboard from './views/admin/AdminDashboard';

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

// User interface
interface User {
  signInDetails?: {
    loginId?: string;
  };
  username?: string;
}

// Sidebar Navigation Component
const Sidebar: React.FC<{ user: User; signOut: () => void }> = ({ user, signOut }) => {
  const location = useLocation();
  
  const getUserInitials = (user: User): string => {
    const email = user.signInDetails?.loginId || user.username || '';
    return email.charAt(0).toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
      {/* Logo/Header */}
      <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
        <h1 className="text-xl font-bold text-white">AWS App Accelerator</h1>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link
          to="/dashboard"
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            isActive('/dashboard')
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"></path>
          </svg>
          Dashboard
        </Link>
        
        <Link
          to="/users"
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            isActive('/users')
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          Users
        </Link>
        
        <Link
          to="/posts"
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            isActive('/posts')
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
          </svg>
          Posts
        </Link>
        
        <Link
          to="/admin"
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            isActive('/admin')
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          Admin
        </Link>
      </nav>
      
      {/* User Info & Sign Out at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {getUserInitials(user)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user.signInDetails?.loginId || user.username}
              </p>
              <p className="text-xs text-gray-500">
                {user.userId}
              </p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ApolloProvider client={apolloClient}>
        <Authenticator formFields={formFields}>
          {({ signOut, user }) => (
            <Router>
              <div className="flex h-screen bg-gray-50">
                <Sidebar user={user} signOut={signOut!} />
                
                {/* Main Content */}
                <div className="flex-1 ml-64">
                  <main className="p-6">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/posts" element={<Posts />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </Router>
          )}
        </Authenticator>
      </ApolloProvider>
    </div>
  );
};

export default App;
