import { Component } from '@angular/core';
import { Amplify } from 'aws-amplify';
import awsExports from '../aws-exports.js';

// Configure Amplify
Amplify.configure(awsExports);

@Component({
  selector: 'app-root',
  template: `
    <div class="min-h-screen bg-gray-50">
      <amplify-authenticator [formFields]="formFields">
        <ng-template amplifySlot="authenticated" let-user="user" let-signOut="signOut">
          <nav class="bg-blue-600 text-white shadow-lg">
            <div class="container mx-auto px-4">
              <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4">
                  <h1 class="text-xl font-bold">AWS App Accelerator</h1>
                  <span class="text-blue-200">Angular</span>
                </div>
                <div class="flex items-center space-x-3">
                  <span class="text-sm">Welcome, {{ user.attributes?.email || user.username }}</span>
                  <button 
                    (click)="signOut()"
                    class="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm transition-colors">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          <main class="container mx-auto px-4 py-8">
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
              <p class="text-gray-600">Welcome to your AWS Application Accelerator Angular frontend!</p>
              <p class="text-sm text-gray-500 mt-4">
                User: {{ user.attributes?.given_name }} {{ user.attributes?.family_name }}
                <br>
                Email: {{ user.attributes?.email }}
              </p>
            </div>
          </main>
        </ng-template>
      </amplify-authenticator>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AppComponent {
  title = 'AWS App Accelerator - Angular';

  // Custom form fields for sign up
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
}
