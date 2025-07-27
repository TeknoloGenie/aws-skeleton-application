import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationProps {
  user: any;
  signOut: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, signOut }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : 'hover:bg-blue-600';
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">AWS App Accelerator</h1>
            <span className="text-blue-200">React</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/dashboard')}`}
            >
              Dashboard
            </Link>
            <Link
              to="/posts"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/posts')}`}
            >
              Posts
            </Link>
            <Link
              to="/users"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/users')}`}
            >
              Users
            </Link>

            <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-blue-500">
              <span className="text-sm">
                Welcome, {user?.attributes?.email || user?.username}
              </span>
              <button
                onClick={signOut}
                className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
