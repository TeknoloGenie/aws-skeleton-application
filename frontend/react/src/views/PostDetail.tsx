import { useMutation, useQuery, useSubscription } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CREATE_COMMENT, DELETE_COMMENT, GET_POST, LIST_COMMENTS, ON_CREATE_COMMENT, UPDATE_COMMENT } from '../graphql/queries';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  postId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { trackAction, trackError } = useAnalytics('post-detail');

  // State
  const [comments, setComments] = useState<Comment[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingComment, setUpdatingComment] = useState(false);
  const [newComment, setNewComment] = useState({ content: '' });
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  // Apollo hooks
  const { data: postData, loading, error: queryError } = useQuery(GET_POST, {
    variables: { id },
    skip: !id
  });

  // Comments query - now enabled
  const { data: commentsData, loading: commentsLoading } = useQuery(LIST_COMMENTS, {
    variables: { postId: id },
    skip: !id // Only skip if no post ID
  });

  const [createComment] = useMutation(CREATE_COMMENT);
  const [updateComment] = useMutation(UPDATE_COMMENT);
  const [deleteComment] = useMutation(DELETE_COMMENT);

  // Subscribe to new comments - now enabled
  useSubscription(ON_CREATE_COMMENT, {
    variables: { postId: id },
    skip: !id, // Only skip if no post ID
    onData: ({ data }) => {
      if (data.data?.onCreateComment) {
        const newComment = data.data.onCreateComment;
        setComments(prev => {
          // Avoid duplicates
          if (prev.find(c => c.id === newComment.id)) {
            return prev;
          }
          return [...prev, newComment];
        });
        trackAction('comment-received', { commentId: newComment.id });
      }
    }
  });

  // Derived state
  const post = postData?.getPost;

  // Effects
  useEffect(() => {
    if (post) {
      trackAction('post-viewed', { postId: post.id });
    }
  }, [post, trackAction]);

  useEffect(() => {
    if (queryError) {
      trackError('post-load-failed', { error: queryError.message });
    }
  }, [queryError, trackError]);

  useEffect(() => {
    if (commentsData?.listComments) {
      setComments(commentsData.listComments);
    }
  }, [commentsData]);

  // Methods
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.content.trim() || !isAuthenticated) return;
    
    try {
      setSubmittingComment(true);
      
      const input = {
        content: newComment.content.trim(),
        postId: post!.id,
        userId: user!.id
      };
      
      const result = await createComment({ 
        variables: { input }
      });
      
      const createdComment = result.data.createComment;
      
      // Add to local comments if not already added by subscription
      setComments(prev => {
        if (prev.find(c => c.id === createdComment.id)) {
          return prev;
        }
        return [...prev, createdComment];
      });
      
      setNewComment({ content: '' });
      trackAction('comment-created', { commentId: createdComment.id });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating comment:', error);
      trackError('comment-creation-failed', { error: error.message });
    } finally {
      setSubmittingComment(false);
    }
  };

  const canEditComment = (comment: Comment): boolean => {
    return Boolean(isAuthenticated && (
      user?.id === comment.userId || 
      user?.groups?.includes('admins')
    ));
  };

  const startEditComment = (comment: Comment) => {
    setEditingComment({ ...comment });
    trackAction('comment-edit-started', { commentId: comment.id });
  };

  const cancelEditComment = () => {
    setEditingComment(null);
  };

  const updateCommentHandler = async () => {
    if (!editingComment?.content.trim()) return;
    
    try {
      setUpdatingComment(true);
      
      const input = {
        id: editingComment.id,
        content: editingComment.content.trim()
      };
      
      const result = await updateComment({ 
        variables: { input }
      });
      
      const updatedComment = result.data.updateComment;
      
      // Update local comment
      setComments(prev => prev.map(c => 
        c.id === updatedComment.id ? { ...c, ...updatedComment } : c
      ));
      
      setEditingComment(null);
      trackAction('comment-updated', { commentId: updatedComment.id });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating comment:', error);
      trackError('comment-update-failed', { error: error.message });
    } finally {
      setUpdatingComment(false);
    }
  };

  const deleteCommentHandler = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await deleteComment({ 
        variables: { input: { id: commentId } }
      });
      
      // Remove from local comments
      setComments(prev => prev.filter(c => c.id !== commentId));
      trackAction('comment-deleted', { commentId });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error deleting comment:', error);
      trackError('comment-deletion-failed', { error: error.message });
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Posts
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-2 text-gray-600">Loading post...</p>
          </div>
        )}

        {/* Error State */}
        {queryError && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Post not found</h3>
            <p className="text-gray-600">{queryError.message}</p>
          </div>
        )}

        {/* Post Content */}
        {post && (
          <div className="space-y-8">
            {/* Post Header */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium">{post.user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{post.user?.name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <span 
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    post.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{post.content}</p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Comments ({comments.length})
                </h2>
              </div>

              {/* Add Comment Form (Authenticated Users Only) */}
              {isAuthenticated ? (
                <div className="mb-8">
                  <form onSubmit={submitComment} className="space-y-4">
                    <div>
                      <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700 mb-2">
                        Add a comment
                      </label>
                      <textarea
                        id="comment-content"
                        value={newComment.content}
                        onChange={(e) => setNewComment({ content: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Share your thoughts..."
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.content.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingComment && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-center">
                    <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                      Sign in
                    </a>
                    {' '}to join the conversation
                  </p>
                </div>
              )}

              {/* Comments Loading */}
              {commentsLoading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                  <p className="mt-2 text-gray-600">Loading comments...</p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6">
                {comments.length === 0 && !commentsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 text-sm font-medium">{comment.user?.name?.charAt(0) || 'U'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{comment.user?.name || 'Unknown User'}</p>
                              <p className="text-sm text-gray-500">{formatDate(comment.createdAt)}</p>
                            </div>
                            {canEditComment(comment) && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => startEditComment(comment)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Edit comment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteCommentHandler(comment.id)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Delete comment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Comment Content (View Mode) */}
                          {editingComment?.id !== comment.id ? (
                            <div className="text-gray-700">
                              {comment.content}
                            </div>
                          ) : (
                            /* Comment Content (Edit Mode) */
                            <div className="space-y-3">
                              <textarea
                                value={editingComment.content}
                                onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                aria-label="Edit comment"
                                required
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEditComment}
                                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={updateCommentHandler}
                                  disabled={updatingComment}
                                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                                >
                                  {updatingComment ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
