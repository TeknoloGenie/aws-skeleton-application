import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from '@aws-amplify/auth';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-50">
      <div class="p-6">
        <h1 class="text-xl font-bold text-gray-800">AWS App Accelerator</h1>
      </div>
      
      <div class="px-4">
        <ul class="space-y-2">
          <li>
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-blue-50 text-blue-700"
              class="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"></path>
              </svg>
              Dashboard
            </a>
          </li>
          
          <li>
            <a
              routerLink="/users"
              routerLinkActive="bg-blue-50 text-blue-700"
              class="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              Users
            </a>
          </li>
          
          <li>
            <a
              routerLink="/posts"
              routerLinkActive="bg-blue-50 text-blue-700"
              class="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
              Posts
            </a>
          </li>
          
          @if (isAdmin) {
            <li>
              <a
                routerLink="/admin"
                routerLinkActive="bg-blue-50 text-blue-700"
                class="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Admin
              </a>
            </li>
          }
        </ul>
      </div>
      
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">{{ userInitials || '?' }}</span>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-700">{{ displayName || 'Loading...' }}</p>
              <p class="text-xs text-gray-500">{{ userEmail || '' }}</p>
            </div>
          </div>
          <button
            (click)="signOut()"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .space-y-2 > * + * {
      margin-top: 0.5rem;
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authenticator = inject(AuthenticatorService);

  userName = '';
  userEmail = '';
  userInitials = '';
  displayName = '';
  isAdmin = false;
  private authSubscription?: Subscription;

  async ngOnInit() {
    // Wait a bit for authentication to settle
    setTimeout(async () => {
      await this.loadUserInfo();
    }, 500);

    // Subscribe to authentication state changes
    this.authSubscription = this.authenticator.subscribe((authState) => {
      console.log('Auth state changed:', authState.authStatus);
      if (authState.authStatus === 'authenticated') {
        // Add a small delay to ensure user data is available
        setTimeout(() => {
          this.loadUserInfo();
        }, 100);
      } else if (authState.authStatus === 'unauthenticated') {
        this.clearUserInfo();
      }
    }) as any; // Type assertion to handle Amplify subscription type mismatch
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private async loadUserInfo() {
    try {
      // First check if we have a valid session
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken) {
        console.log('No valid session found');
        return;
      }

      const user = await getCurrentUser();
      console.log('User info loaded:', user);
      
      // Check admin status
      const idToken = session.tokens.idToken;
      const groups = idToken?.payload['cognito:groups'] || [];
      const groupsArray = Array.isArray(groups) ? groups : [];
      this.isAdmin = groupsArray.includes('admins');
      
      // Try to get the best display name
      this.userName = user.username || '';
      this.userEmail = user.signInDetails?.loginId || user.username || '';
      this.displayName = this.userEmail || this.userName || 'User';
      this.userInitials = this.generateInitials(this.displayName);
      
      console.log('Display name:', this.displayName, 'Initials:', this.userInitials, 'Admin:', this.isAdmin);
    } catch (error) {
      console.error('Error getting user info:', error);
      this.clearUserInfo();
    }
  }

  private clearUserInfo() {
    this.userName = '';
    this.userEmail = '';
    this.userInitials = '';
    this.displayName = '';
    this.isAdmin = false;
  }

  private generateInitials(name: string): string {
    if (!name) return '?';
    
    // If it's an email, use the first letter
    if (name.includes('@')) {
      return name.charAt(0).toUpperCase();
    }
    
    // If it's a name with spaces, use first letter of each word
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  async signOut() {
    try {
      await amplifySignOut();
      this.clearUserInfo();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}
