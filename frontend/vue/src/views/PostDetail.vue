<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <div class="mb-6">
        <button 
          @click="$router.go(-1)"
          class="inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to Posts
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p class="mt-2 text-gray-600">Loading post...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <div class="text-red-600 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Post not found</h3>
        <p class="text-gray-600">{{ error }}</p>
      </div>

      <!-- Post Content -->
      <div v-else-if="post" class="space-y-8">
        <!-- Post Header -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-primary-600 font-medium">{{ post.user?.name?.charAt(0) || 'U' }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ post.user?.name || 'Unknown User' }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(post.createdAt) }}</p>
              </div>
            </div>
            <span 
              :class="post.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            >
              {{ post.published ? 'Published' : 'Draft' }}
            </span>
          </div>

          <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ post.title }}</h1>
          <div class="prose max-w-none">
            <p class="text-gray-700 leading-relaxed">{{ post.content }}</p>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">
              Comments ({{ comments.length }})
            </h2>
          </div>

          <!-- Add Comment Form (Authenticated Users Only) -->
          <div v-if="isAuthenticated" class="mb-8">
            <form @submit.prevent="submitComment" class="space-y-4">
              <div>
                <label for="comment-content" class="block text-sm font-medium text-gray-700 mb-2">
                  Add a comment
                </label>
                <textarea
                  id="comment-content"
                  v-model="newComment.content"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Share your thoughts..."
                  required
                ></textarea>
              </div>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="submittingComment || !newComment.content.trim()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg v-if="submittingComment" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ submittingComment ? 'Posting...' : 'Post Comment' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Login Prompt for Unauthenticated Users -->
          <div v-else class="mb-8 p-4 bg-gray-50 rounded-lg">
            <p class="text-gray-600 text-center">
              <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </router-link>
              to join the conversation
            </p>
          </div>

          <!-- Comments List -->
          <div class="space-y-6">
            <div v-if="comments.length === 0" class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>

            <div v-for="comment in comments" :key="comment.id" class="border-b border-gray-200 pb-6 last:border-b-0">
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-primary-600 text-sm font-medium">{{ comment.user?.name?.charAt(0) || 'U' }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <p class="text-sm font-medium text-gray-900">{{ comment.user?.name || 'Unknown User' }}</p>
                      <p class="text-sm text-gray-500">{{ formatDate(comment.createdAt) }}</p>
                    </div>
                    <div v-if="canEditComment(comment)" class="flex items-center space-x-2">
                      <button
                        @click="startEditComment(comment)"
                        class="text-gray-400 hover:text-gray-600"
                        title="Edit comment"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        @click="deleteComment(comment.id)"
                        class="text-red-400 hover:text-red-600"
                        title="Delete comment"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Comment Content (View Mode) -->
                  <div v-if="editingComment?.id !== comment.id" class="text-gray-700">
                    {{ comment.content }}
                  </div>
                  
                  <!-- Comment Content (Edit Mode) -->
                  <div v-else class="space-y-3">
                    <textarea
                      v-model="editingComment.content"
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    ></textarea>
                    <div class="flex justify-end space-x-2">
                      <button
                        @click="cancelEditComment"
                        class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        @click="updateComment"
                        :disabled="updatingComment"
                        class="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                      >
                        {{ updatingComment ? 'Saving...' : 'Save' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useAnalytics } from '../composables/useAnalytics';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();
const route = useRoute();
const { user, isAuthenticated } = useAuth();
const { trackAction, trackError } = useAnalytics('post-detail');

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  comments?: Comment[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
}

// Reactive data
const post = ref<Post | null>(null);
const comments = ref<Comment[]>([]);
const loading = ref(true);
const error = ref('');
const submittingComment = ref(false);
const updatingComment = ref(false);
const newComment = ref({ content: '' });
const editingComment = ref<Comment | null>(null);

// GraphQL queries and mutations
const GET_POST = `
  query GetPost($id: ID!) {
    getPost(id: $id) {
      id
      title
      content
      published
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
      comments {
        id
        content
        createdAt
        updatedAt
        user {
          id
          name
          email
        }
      }
    }
  }
`;

const CREATE_COMMENT = `
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      postId
      userId
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

const UPDATE_COMMENT = `
  mutation UpdateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      content
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

const DELETE_COMMENT = `
  mutation DeleteComment($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      id
    }
  }
`;

// Subscription for real-time comments
const ON_CREATE_COMMENT = `
  subscription OnCreateComment($postId: ID!) {
    onCreateComment(postId: $postId) {
      id
      content
      postId
      userId
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

// Methods
const loadPost = async () => {
  try {
    loading.value = true;
    const postId = route.params.id;
    
    const result = await client.graphql({ query: GET_POST, variables: { id: postId } });
    post.value = result.data.getPost;
    
    if (post.value) {
      comments.value = post.value.comments || [];
      trackAction('post-viewed', { postId: post.value.id });
      
      // Subscribe to new comments
      subscribeToComments();
    } else {
      error.value = 'Post not found';
    }
  } catch (err) {
    console.error('Error loading post:', err);
    error.value = 'Failed to load post';
    trackError('post-load-failed', { error: err.message });
  } finally {
    loading.value = false;
  }
};

const subscribeToComments = () => {
  try {
    client.graphql({ query: ON_CREATE_COMMENT, variables: { postId: post.value?.id } })
      .subscribe({
        next: ({ data }: any) => {
          const newComment = data.onCreateComment;
          if (newComment && !comments.value.find(c => c.id === newComment.id)) {
            comments.value.push(newComment);
            trackAction('comment-received', { commentId: newComment.id });
          }
        },
        error: (err) => {
          console.error('Subscription error:', err);
          trackError('comment-subscription-failed', { error: err.message });
        }
      });
  } catch (err) {
    console.error('Failed to subscribe to comments:', err);
  }
};

const submitComment = async () => {
  if (!newComment.value.content.trim() || !isAuthenticated.value) return;
  
  try {
    submittingComment.value = true;
    
    const input = {
      content: newComment.value.content.trim(),
      postId: post.value.id,
      userId: user.value.id
    };
    
    const result = await client.graphql({ query: CREATE_COMMENT, variables: { input } });
    const createdComment = result.data.createComment;
    
    // Add to local comments if not already added by subscription
    if (!comments.value.find(c => c.id === createdComment.id)) {
      comments.value.push(createdComment);
    }
    
    newComment.value.content = '';
    trackAction('comment-created', { commentId: createdComment.id });
  } catch (err) {
    console.error('Error creating comment:', err);
    trackError('comment-creation-failed', { error: err.message });
  } finally {
    submittingComment.value = false;
  }
};

const canEditComment = (comment: Comment) => {
  return isAuthenticated.value && (
    user.value.id === comment.userId || 
    user.value.groups?.includes('admins')
  );
};

const startEditComment = (comment: Comment) => {
  editingComment.value = { ...comment };
  trackAction('comment-edit-started', { commentId: comment.id });
};

const cancelEditComment = () => {
  editingComment.value = null;
};

const updateComment = async () => {
  if (!editingComment.value?.content.trim()) return;
  
  try {
    updatingComment.value = true;
    
    const input = {
      id: editingComment.value.id,
      content: editingComment.value.content.trim()
    };
    
    const result = await client.graphql({ query: UPDATE_COMMENT, variables: { input } });
    const updatedComment = result.data.updateComment;
    
    // Update local comment
    const index = comments.value.findIndex(c => c.id === updatedComment.id);
    if (index !== -1) {
      comments.value[index] = { ...comments.value[index], ...updatedComment };
    }
    
    editingComment.value = null;
    trackAction('comment-updated', { commentId: updatedComment.id });
  } catch (err) {
    console.error('Error updating comment:', err);
    trackError('comment-update-failed', { error: err.message });
  } finally {
    updatingComment.value = false;
  }
};

const deleteComment = async (commentId: string) => {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  try {
    await client.graphql({ query: DELETE_COMMENT, variables: { input: { id: commentId } } });
    
    // Remove from local comments
    comments.value = comments.value.filter(c => c.id !== commentId);
    trackAction('comment-deleted', { commentId });
  } catch (err) {
    console.error('Error deleting comment:', err);
    trackError('comment-deletion-failed', { error: err.message });
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Lifecycle
onMounted(() => {
  loadPost();
});
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

.prose {
  @apply text-gray-700 leading-relaxed;
}
</style>
