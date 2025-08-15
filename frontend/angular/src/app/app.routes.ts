import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { fetchAuthSession } from '@aws-amplify/auth';

// Auth guard function
const authGuard = async () => {
  const router = inject(Router);
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.accessToken) {
      return true;
    } else {
      console.log('No valid session, redirecting to login');
      router.navigate(['/login']);
      return false;
    }
  } catch (error) {
    console.log('Authentication check failed:', error);
    router.navigate(['/login']);
    return false;
  }
};

// Redirect guard for login page (redirect if already authenticated)
const loginGuard = async () => {
  const router = inject(Router);
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.accessToken) {
      console.log('User already authenticated, redirecting to dashboard');
      router.navigate(['/dashboard']);
      return false;
    } else {
      return true;
    }
  } catch {
    // User is not authenticated, allow access to login page
    return true;
  }
};

// Admin guard function
const adminGuard = async () => {
  const router = inject(Router);
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.accessToken) {
      const idToken = session.tokens.idToken;
      const groups = idToken?.payload['cognito:groups'] || [];
      if (groups.includes('admins')) {
        return true;
      } else {
        console.log('User not in admin group, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
      }
    } else {
      console.log('No valid session, redirecting to login');
      router.navigate(['/login']);
      return false;
    }
  } catch (error) {
    console.log('Authentication check failed:', error);
    router.navigate(['/login']);
    return false;
  }
};

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./views/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard]
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'users', 
    loadComponent: () => import('./views/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'posts', 
    loadComponent: () => import('./views/posts/posts.component').then(m => m.PostsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./views/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [adminGuard]
  },
  // Catch all route - redirect to login
  { path: '**', redirectTo: '/login' }
];
