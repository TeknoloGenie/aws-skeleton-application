import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { API, graphqlOperation } from 'aws-amplify';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AnalyticsService } from '../services/analytics.service';

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

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  comments: Comment[];
}

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css']
})
export class PostDetailComponent implements OnInit, OnDestroy {
  post: Post | null = null;
  comments: Comment[] = [];
  loading = true;
  error = '';
  submittingComment = false;
  updatingComment = false;
  newComment = { content: '' };
  editingComment: Comment | null = null;
  
  private subscription?: Subscription;
  private commentSubscription?: any;

  // GraphQL queries and mutations
  private readonly GET_POST = `
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

  private readonly CREATE_COMMENT = `
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

  private readonly UPDATE_COMMENT = `
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

  private readonly DELETE_COMMENT = `
    mutation DeleteComment($input: DeleteCommentInput!) {
      deleteComment(input: $input) {
        id
      }
    }
  `;

  private readonly ON_CREATE_COMMENT = `
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private analytics: AnalyticsService
  ) {
    this.analytics.registerComponent('post-detail');
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadPost(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.commentSubscription) {
      this.commentSubscription.unsubscribe();
    }
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentUser(): any {
    return this.authService.getCurrentUser();
  }

  async loadPost(postId: string): Promise<void> {
    try {
      this.loading = true;
      const result: any = await API.graphql(graphqlOperation(this.GET_POST, { id: postId }));
      const postData = result.data.getPost;
      
      if (postData) {
        this.post = postData;
        this.comments = postData.comments || [];
        this.analytics.trackAction('post-viewed', { postId: postData.id });
        
        // Subscribe to new comments
        this.subscribeToComments(postData.id);
      } else {
        this.error = 'Post not found';
      }
    } catch (err: any) {
      console.error('Error loading post:', err);
      this.error = 'Failed to load post';
      this.analytics.trackError('post-load-failed', { error: err.message });
    } finally {
      this.loading = false;
    }
  }

  private subscribeToComments(postId: string): void {
    try {
      this.commentSubscription = API.graphql(graphqlOperation(this.ON_CREATE_COMMENT, { postId })) as any;
      this.commentSubscription.subscribe({
        next: ({ value }: any) => {
          const newComment = value.data.onCreateComment;
          if (newComment && !this.comments.find(c => c.id === newComment.id)) {
            this.comments.push(newComment);
            this.analytics.trackAction('comment-received', { commentId: newComment.id });
          }
        },
        error: (err: any) => {
          console.error('Subscription error:', err);
          this.analytics.trackError('comment-subscription-failed', { error: err.message });
        }
      });
    } catch (err: any) {
      console.error('Failed to subscribe to comments:', err);
    }
  }

  async submitComment(): Promise<void> {
    if (!this.newComment.content.trim() || !this.isAuthenticated) return;
    
    try {
      this.submittingComment = true;
      
      const input = {
        content: this.newComment.content.trim(),
        postId: this.post!.id,
        userId: this.currentUser.id
      };
      
      const result: any = await API.graphql(graphqlOperation(this.CREATE_COMMENT, { input }));
      const createdComment = result.data.createComment;
      
      // Add to local comments if not already added by subscription
      if (!this.comments.find(c => c.id === createdComment.id)) {
        this.comments.push(createdComment);
      }
      
      this.newComment.content = '';
      this.analytics.trackAction('comment-created', { commentId: createdComment.id });
    } catch (err: any) {
      console.error('Error creating comment:', err);
      this.analytics.trackError('comment-creation-failed', { error: err.message });
    } finally {
      this.submittingComment = false;
    }
  }

  canEditComment(comment: Comment): boolean {
    return this.isAuthenticated && (
      this.currentUser?.id === comment.userId || 
      this.currentUser?.groups?.includes('admins')
    );
  }

  startEditComment(comment: Comment): void {
    this.editingComment = { ...comment };
    this.analytics.trackAction('comment-edit-started', { commentId: comment.id });
  }

  cancelEditComment(): void {
    this.editingComment = null;
  }

  async updateComment(): Promise<void> {
    if (!this.editingComment?.content.trim()) return;
    
    try {
      this.updatingComment = true;
      
      const input = {
        id: this.editingComment.id,
        content: this.editingComment.content.trim()
      };
      
      const result: any = await API.graphql(graphqlOperation(this.UPDATE_COMMENT, { input }));
      const updatedComment = result.data.updateComment;
      
      // Update local comment
      const index = this.comments.findIndex(c => c.id === updatedComment.id);
      if (index !== -1) {
        this.comments[index] = { ...this.comments[index], ...updatedComment };
      }
      
      this.editingComment = null;
      this.analytics.trackAction('comment-updated', { commentId: updatedComment.id });
    } catch (err: any) {
      console.error('Error updating comment:', err);
      this.analytics.trackError('comment-update-failed', { error: err.message });
    } finally {
      this.updatingComment = false;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await API.graphql(graphqlOperation(this.DELETE_COMMENT, { input: { id: commentId } }));
      
      // Remove from local comments
      this.comments = this.comments.filter(c => c.id !== commentId);
      this.analytics.trackAction('comment-deleted', { commentId });
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      this.analytics.trackError('comment-deletion-failed', { error: err.message });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/posts']);
  }
}
