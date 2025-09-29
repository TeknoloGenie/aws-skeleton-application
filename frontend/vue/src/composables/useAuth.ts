import { ref, onMounted } from 'vue';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

interface User {
  id: string;
  username: string;
  groups: string[];
}

export const useAuth = () => {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const loading = ref(true);

  const checkAuthentication = async () => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.accessToken) {
        const currentUser = await getCurrentUser();
        const idToken = session.tokens.idToken;
        const groups = idToken?.payload['cognito:groups'] || [];
        
        // Ensure groups is always a string array
        const groupsArray = Array.isArray(groups) 
          ? groups.filter((g): g is string => typeof g === 'string')
          : typeof groups === 'string' 
            ? [groups] 
            : [];
        
        user.value = {
          id: currentUser.userId,
          username: currentUser.username,
          groups: groupsArray
        };
        isAuthenticated.value = true;
      } else {
        isAuthenticated.value = false;
        user.value = null;
      }
    } catch (error) {
      isAuthenticated.value = false;
      user.value = null;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    checkAuthentication();
  });

  return {
    user,
    isAuthenticated,
    loading,
    checkAuthentication
  };
};
