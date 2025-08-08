import { useMutation, useQuery } from '@apollo/client';
import { fetchAuthSession } from '@aws-amplify/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { CREATE_USER, DELETE_USER, LIST_USERS, UPDATE_USER } from '../graphql/queries';
interface CognitoUser {
  Username: string;
  UserStatus: string;
  UserCreateDate: string;
  Attributes: Array<{ Name: string; Value: string }>;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  bio?: string;
  role: string;
  cognitoId: string;
  createdAt: string;
  updatedAt: string;
}

interface UserForm {
  name: string;
  email: string;
  bio: string;
  role: string;
}

interface CognitoUserForm {
  email: string;
  givenName: string;
  familyName: string;
  temporaryPassword: string;
  sendEmail: boolean;
}

const Users: React.FC = () => {
  const [cognitoUsers, setCognitoUsers] = useState<CognitoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showCreateCognitoDialog, setShowCreateCognitoDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCognitoUser, setSelectedCognitoUser] = useState<CognitoUser | null>(null);

  const [userForm, setUserForm] = useState<UserForm>({
    name: '',
    email: '',
    bio: '',
    role: 'user'
  });

  const [cognitoUserForm, setCognitoUserForm] = useState<CognitoUserForm>({
    email: '',
    givenName: '',
    familyName: '',
    temporaryPassword: '',
    sendEmail: true
  });

  // GraphQL queries and mutations
  const { data: userRecordsData, refetch: refetchUserRecords } = useQuery(LIST_USERS, {
    fetchPolicy: 'network-only'
  });

  const [createUserMutation] = useMutation(CREATE_USER);
  const [updateUserMutation] = useMutation(UPDATE_USER);
  const [deleteUserMutation] = useMutation(DELETE_USER);

  const userRecords = userRecordsData?.listUsers || [];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        loadCognitoUsers(),
        refetchUserRecords()
      ]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refetchUserRecords]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadCognitoUsers = async () => {
    try {
      const session = await fetchAuthSession();
      // Use ID token for group information, fallback to access token
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Using token type:', session.tokens?.idToken ? 'ID Token' : 'Access Token');

      // Get admin API URL from aws-exports
      let adminApiUrl = '';
      try {
        // @ts-expect-error we know this file exists so we ignore
        const { default: awsExports } = await import('../aws-exports.js');
        adminApiUrl = awsExports.aws_admin_api_endpoint || '';
      } catch (error) {
        console.warn('Could not load aws-exports, using relative URL', error);
      }

      const apiUrl = adminApiUrl ? `${adminApiUrl}api/admin/cognito/users` : '/api/admin/cognito/users';

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorData = { message: errorText };
        }
        
        throw new Error(`Failed to fetch Cognito users: ${response.status} ${response.statusText}. ${errorData.error || errorData.message || ''}`);
      }

      const data = await response.json();
      setCognitoUsers(data.users || []);
    } catch (err: unknown) {
      console.error('Error loading Cognito users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to load Cognito users: ${errorMessage}`);
    }
  };

  const getUserInitials = (cognitoUser: CognitoUser): string => {
    const givenName = cognitoUser.Attributes.find(attr => attr.Name === 'given_name')?.Value || '';
    const familyName = cognitoUser.Attributes.find(attr => attr.Name === 'family_name')?.Value || '';
    const email = cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || '';
    
    if (givenName && familyName) {
      return (givenName.charAt(0) + familyName.charAt(0)).toUpperCase();
    }
    
    return email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = (cognitoUser: CognitoUser): string => {
    const givenName = cognitoUser.Attributes.find(attr => attr.Name === 'given_name')?.Value || '';
    const familyName = cognitoUser.Attributes.find(attr => attr.Name === 'family_name')?.Value || '';
    
    if (givenName && familyName) {
      return `${givenName} ${familyName}`;
    }
    
    return cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || cognitoUser.Username;
  };

  const getUserEmail = (cognitoUser: CognitoUser): string => {
    return cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || '';
  };

  const getStatusBadgeClass = (cognitoUser: CognitoUser): string => {
    switch (cognitoUser.UserStatus) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'UNCONFIRMED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FORCE_CHANGE_PASSWORD':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const hasUserRecord = (cognitoId: string): boolean => {
    return userRecords.some((record: UserRecord) => record.cognitoId === cognitoId);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const openProvisionDialog = (cognitoUser: CognitoUser) => {
    setSelectedCognitoUser(cognitoUser);
    setIsEditing(false);
    setUserForm({
      name: getUserDisplayName(cognitoUser),
      email: getUserEmail(cognitoUser),
      bio: '',
      role: 'user'
    });
    setShowDialog(true);
  };

  const openEditDialog = (cognitoUser: CognitoUser) => {
    setSelectedCognitoUser(cognitoUser);
    setIsEditing(true);
    
    const existingRecord = userRecords.find((record: UserRecord) => record.cognitoId === cognitoUser.Username);
    if (existingRecord) {
      setUserForm({
        name: existingRecord.name,
        email: existingRecord.email,
        bio: existingRecord.bio || '',
        role: existingRecord.role
      });
    }
    
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setSelectedCognitoUser(null);
    setUserForm({
      name: '',
      email: '',
      bio: '',
      role: 'user'
    });
  };

  const submitUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCognitoUser) return;
    
    setSubmitting(true);
    
    try {
      if (isEditing) {
        // Update existing User record via GraphQL mutation
        const existingRecord = userRecords.find((record: UserRecord) => record.cognitoId === selectedCognitoUser.Username);
        if (existingRecord) {
          await updateUserMutation({
            variables: {
              input: {
                id: existingRecord.id,
                name: userForm.name,
                bio: userForm.bio,
                role: userForm.role
              }
            }
          });
        }
      } else {
        // Create new User record via GraphQL mutation
        await createUserMutation({
          variables: {
            input: {
              name: userForm.name,
              email: userForm.email,
              bio: userForm.bio,
              role: userForm.role,
              cognitoId: selectedCognitoUser.Username
            }
          }
        });
      }
      
      // Refetch user records to update the UI
      await refetchUserRecords();
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save user record';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const createCognitoUser = async (formData: CognitoUserForm) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }


      // @ts-expect-error we know this file exists so we ignore
      const { default: awsExports } = await import('../aws-exports.js');
      const adminApiUrl = awsExports.aws_admin_api_endpoint || '';
      const apiUrl = `${adminApiUrl}api/admin/cognito/users`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          givenName: formData.givenName,
          familyName: formData.familyName,
          temporaryPassword: formData.temporaryPassword,
          sendEmail: formData.sendEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Cognito user');
      }

      return await response.json();
    } catch (err: unknown) {
      console.error('Error creating Cognito user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to create Cognito user: ${errorMessage}`);
    }
  };

  const deleteCognitoUser = async (username: string) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // @ts-expect-error we know this file exists so we ignore
      const { default: awsExports } = await import('../aws-exports.js');
      const adminApiUrl = awsExports.aws_admin_api_endpoint || '';
      const apiUrl = `${adminApiUrl}api/admin/cognito/users/${username}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete Cognito user');
      }

      return await response.json();
    } catch (err: unknown) {
      console.error('Error deleting Cognito user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to delete Cognito user: ${errorMessage}`);
    }
  };

  const openCreateCognitoDialog = () => {
    setCognitoUserForm({
      email: '',
      givenName: '',
      familyName: '',
      temporaryPassword: 'TempPass123!',
      sendEmail: true
    });
    setShowCreateCognitoDialog(true);
  };

  const closeCreateCognitoDialog = () => {
    setShowCreateCognitoDialog(false);
    setCognitoUserForm({
      email: '',
      givenName: '',
      familyName: '',
      temporaryPassword: '',
      sendEmail: true
    });
  };

  const submitCognitoUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await createCognitoUser(cognitoUserForm);
      await loadCognitoUsers(); // Refresh the list
      closeCreateCognitoDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create Cognito user';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCognitoUser = async (cognitoUser: CognitoUser) => {
    if (!confirm(`Are you sure you want to delete user "${getUserDisplayName(cognitoUser)}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete the User record if it exists
      const existingRecord = userRecords.find((record: UserRecord) => record.cognitoId === cognitoUser.Username);
      if (existingRecord) {
        await deleteUserMutation({
          variables: {
            input: {
              id: existingRecord.id
            }
          }
        });
      }

      // Then delete the Cognito user
      await deleteCognitoUser(cognitoUser.Username);
      
      // Refresh both lists
      await Promise.all([
        loadCognitoUsers(),
        refetchUserRecords()
      ]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600 mt-2">Manage Cognito users and their application profiles</p>
          </div>
          <button
            onClick={openCreateCognitoDialog}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Create User
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading users...</p>
        </div>
      ) : (
        /* Users Table */
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">All Users ({cognitoUsers.length})</h2>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>

          {cognitoUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">No Cognito users are currently registered.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cognitoUsers.map((cognitoUser) => (
                    <tr key={cognitoUser.Username}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {getUserInitials(cognitoUser)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getUserDisplayName(cognitoUser)}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {cognitoUser.Username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getUserEmail(cognitoUser)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(cognitoUser)}`}>
                          {cognitoUser.UserStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(cognitoUser.UserCreateDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!hasUserRecord(cognitoUser.Username) ? (
                          <button
                            onClick={() => openProvisionDialog(cognitoUser)}
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors mr-2"
                          >
                            Provision
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditDialog(cognitoUser)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors mr-2"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCognitoUser(cognitoUser)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Provision/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isEditing ? 'Edit User Profile' : 'Provision User Profile'}
              </h3>
              
              <form onSubmit={submitUserForm}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isEditing}
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isEditing ? 'bg-gray-100' : ''}`}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={userForm.bio}
                    onChange={(e) => setUserForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter user bio (optional)"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Create Cognito User Dialog */}
      {showCreateCognitoDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Cognito User
              </h3>
              
              <form onSubmit={submitCognitoUserForm}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={cognitoUserForm.email}
                    onChange={(e) => setCognitoUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={cognitoUserForm.givenName}
                    onChange={(e) => setCognitoUserForm(prev => ({ ...prev, givenName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={cognitoUserForm.familyName}
                    onChange={(e) => setCognitoUserForm(prev => ({ ...prev, familyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={cognitoUserForm.temporaryPassword}
                    onChange={(e) => setCognitoUserForm(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="TempPass123!"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    User will be required to change this on first login
                  </p>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cognitoUserForm.sendEmail}
                      onChange={(e) => setCognitoUserForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Send welcome email to user</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeCreateCognitoDialog}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
