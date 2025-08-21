import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../services/analytics.service';
import { GraphQLClientService } from '../../graphql/client';

interface LogEntry {
  id: string;
  userId: string;
  action: string;
  component: string;
  level: string;
  metadata?: any;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css']
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  logs: LogEntry[] = [];
  filters = {
    search: '',
    component: '',
    action: '',
    level: '',
    dateFrom: '',
    dateTo: ''
  };
  
  currentPage = 1;
  pageSize = 20;
  totalLogs = 0;
  isLoading = false;
  
  uniqueComponents: string[] = [];
  uniqueActions: string[] = [];
  
  private refreshInterval: any;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
    this.setupAutoRefresh();
    this.analyticsService.trackView('analytics-dashboard');
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private setupAutoRefresh(): void {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadLogs();
    }, 30000);
  }

  async loadLogs(): Promise<void> {
    try {
      this.isLoading = true;
      
      const query = `
        query ListLogs($limit: Int, $nextToken: String) {
          listLogs(limit: $limit, nextToken: $nextToken) {
            id
            userId
            action
            component
            level
            metadata
            createdAt
            user {
              id
              name
              email
            }
          }
        }
      `;

      const result = await this.graphqlClient.query(query, {
        limit: this.pageSize * this.currentPage
      });

      if (result.data?.listLogs) {
        this.logs = result.data.listLogs;
        this.totalLogs = this.logs.length;
        this.extractUniqueValues();
      }
    } catch (error: any) {
      this.analyticsService.trackError('failed-to-load-logs', 'analytics-dashboard', { error: error?.message || 'Unknown error' });
    } finally {
      this.isLoading = false;
    }
  }

  private extractUniqueValues(): void {
    const components = new Set<string>();
    const actions = new Set<string>();
    
    this.logs.forEach(log => {
      if (log.component) components.add(log.component);
      if (log.action) actions.add(log.action);
    });
    
    this.uniqueComponents = Array.from(components).sort();
    this.uniqueActions = Array.from(actions).sort();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadLogs();
    this.analyticsService.trackAction('filter-changed', 'analytics-dashboard', this.filters);
  }

  onSearchChange(): void {
    this.onFilterChange();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      component: '',
      action: '',
      level: '',
      dateFrom: '',
      dateTo: ''
    };
    this.onFilterChange();
    this.analyticsService.trackAction('filters-cleared', 'analytics-dashboard');
  }

  get paginatedLogs(): LogEntry[] {
    let filtered = this.logs;
    
    // Apply filters
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(search) ||
        log.component.toLowerCase().includes(search) ||
        log.user?.name?.toLowerCase().includes(search) ||
        log.user?.email?.toLowerCase().includes(search)
      );
    }
    
    if (this.filters.component) {
      filtered = filtered.filter(log => log.component === this.filters.component);
    }
    
    if (this.filters.action) {
      filtered = filtered.filter(log => log.action === this.filters.action);
    }
    
    if (this.filters.level) {
      filtered = filtered.filter(log => log.level === this.filters.level);
    }
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get filteredLogs(): LogEntry[] {
    let filtered = this.logs;
    
    // Apply filters (same logic as paginatedLogs but without pagination)
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(search) ||
        log.component.toLowerCase().includes(search) ||
        log.user?.name?.toLowerCase().includes(search) ||
        log.user?.email?.toLowerCase().includes(search)
      );
    }
    
    if (this.filters.component) {
      filtered = filtered.filter(log => log.component === this.filters.component);
    }
    
    if (this.filters.action) {
      filtered = filtered.filter(log => log.action === this.filters.action);
    }
    
    if (this.filters.level) {
      filtered = filtered.filter(log => log.level === this.filters.level);
    }
    
    return filtered;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize);
  }

  async exportLogs(): Promise<void> {
    try {
      this.analyticsService.trackAction('export-logs', 'analytics-dashboard');
      
      const csvContent = this.convertToCSV(this.logs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      this.analyticsService.trackError('export-failed', 'analytics-dashboard', { error: error?.message || 'Unknown error' });
    }
  }

  private convertToCSV(logs: LogEntry[]): string {
    const headers = ['ID', 'User ID', 'User Name', 'User Email', 'Action', 'Component', 'Level', 'Created At', 'Metadata'];
    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.user?.name || '',
      log.user?.email || '',
      log.action,
      log.component,
      log.level,
      log.createdAt,
      JSON.stringify(log.metadata || {})
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }
}
