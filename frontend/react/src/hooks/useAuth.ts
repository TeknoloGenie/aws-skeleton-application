import { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

interface User {
  id: string;
  username: string;
  groups: string[];
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthentication = async () => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.accessToken) {
        const currentUser = await getCurrentUser();
        const idToken = session.tokens.idToken;
        const groups = (idToken?.payload['cognito:groups'] as string[]) || [];
        
        setUser({
          id: currentUser.userId,
          username: currentUser.username,
          groups: Array.isArray(groups) ? groups : [groups].filter(Boolean)
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    checkAuthentication
  };
};
