import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { fetchAuthSession } from '@aws-amplify/auth';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, AmplifyAuthenticatorModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or create a new account below
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <amplify-authenticator 
            [formFields]="formFields"
            [hideSignUp]="false">
            <ng-template 
              amplifySlot="authenticated" 
              let-user="user" 
              let-signOut="signOut">
              <div class="text-center">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                  Welcome, {{ getUserDisplayName(user) }}!
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  You are successfully signed in.
                </p>
                <button
                  (click)="handleSignOut(signOut)"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Sign Out
                </button>
                <button
                  (click)="goToDashboard()"
                  class="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            </ng-template>
          </amplify-authenticator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom styles for the authenticator */
    :host ::ng-deep amplify-authenticator {
      --amplify-colors-brand-primary-60: rgb(37 99 235);
      --amplify-colors-brand-primary-80: rgb(29 78 216);
      --amplify-colors-brand-primary-90: rgb(30 64 175);
      --amplify-colors-brand-primary-100: rgb(30 58 138);
    }

    :host ::ng-deep .amplify-button[data-variation="primary"] {
      background-color: rgb(37 99 235);
    }

    :host ::ng-deep .amplify-button[data-variation="primary"]:hover {
      background-color: rgb(29 78 216);
    }

    :host ::ng-deep .amplify-tabs-item[data-state="active"] {
      color: rgb(37 99 235);
      border-bottom-color: rgb(37 99 235);
    }
  `]
})
export class LoginComponent implements OnInit {
  // Custom form fields for sign up (matching Vue implementation)
  formFields = {
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

  constructor(
    private router: Router,
    public authenticator: AuthenticatorService
  ) {}

  async ngOnInit() {
    // Check if user is already authenticated
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.accessToken) {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      // User is not authenticated, stay on login page
      console.log('User not authenticated');
    }

    // Listen for authentication state changes
    this.authenticator.subscribe((authState) => {
      if (authState.authStatus === 'authenticated') {
        console.log('User authenticated, redirecting to dashboard');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  getUserDisplayName(user: any): string {
    return user?.signInDetails?.loginId || user?.username || 'User';
  }

  async handleSignOut(signOut: () => void) {
    try {
      await signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
