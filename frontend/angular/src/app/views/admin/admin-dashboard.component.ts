import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsDashboardComponent } from './analytics-dashboard.component';
import { DataManagementComponent } from './data-management.component';
import { AppConfigurationComponent } from './app-configuration.component';

interface Tab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsDashboardComponent,
    DataManagementComponent,
    AppConfigurationComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'analytics';
  currentUser: any = null;

  tabs: Tab[] = [
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'data', label: '🗃️ Data Management' },
    { id: 'config', label: '⚙️ Configuration' }
  ];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.analyticsService.trackView('admin-dashboard');
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      // This would get current user from auth service
      this.currentUser = { name: 'Admin User' };
      this.analyticsService.trackAction('dashboard-loaded', 'admin-dashboard');
    } catch (error: any) {
      this.analyticsService.trackError('failed-to-load-user', 'admin-dashboard', { error: error?.message || 'Unknown error' });
    }
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.analyticsService.trackAction('tab-changed', 'admin-dashboard', { tab: tabId });
  }

  async signOut(): Promise<void> {
    try {
      this.analyticsService.trackAction('admin-signout', 'admin-dashboard');
      // Implement sign out logic
      window.location.href = '/login';
    } catch (error: any) {
      this.analyticsService.trackError('signout-failed', 'admin-dashboard', { error: error?.message || 'Unknown error' });
    }
  }
}