import React from 'react';
import { useQuery } from '@apollo/client';
import { LIST_POSTS } from '../graphql/queries';

interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  published: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const Posts: React.FC = () => {
  const { data, loading, error } = useQuery(LIST_POSTS);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading posts: {error.message}</p>
      </div>
    );
  }

  const posts: Post[] = data?.listPosts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
        <p className="mt-2 text-gray-600">Manage your blog posts</p>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      post.published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.content}
                </p>

                <div className="flex items-center text-sm text-gray-500">
                  <span>By {post.user?.name || 'Unknown User'}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>

              <div className="ml-4 flex-shrink-0">
                <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No posts</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new post.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;
