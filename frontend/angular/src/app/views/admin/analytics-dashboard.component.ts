import { Component, OnInit, OnDestroy } from '@angular/core';
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
  pageSize = 50;
  subscription: any = null;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.analyticsService.trackView('analytics-dashboard');
    this.loadLogs();
    this.setupSubscription();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  get filteredLogs(): LogEntry[] {
    let filtered = this.logs;

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.component.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.user?.name?.toLowerCase().includes(search)
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

    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.createdAt) >= fromDate);
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      filtered = filtered.filter(log => new Date(log.createdAt) <= toDate);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get paginatedLogs(): LogEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredLogs.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize);
  }

  get uniqueComponents(): string[] {
    return [...new Set(this.logs.map(log => log.component))].sort();
  }

  get uniqueActions(): string[] {
    return [...new Set(this.logs.map(log => log.action))].sort();
  }

  async loadLogs(): Promise<void> {
    try {
      const query = `
        query GetLogs($limit: Int, $nextToken: String) {
          listLogs(limit: $limit, nextToken: $nextToken) {
            items {
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
            nextToken
          }
        }
      `;

      const result = await this.graphqlClient.query(query, { limit: 1000 });
      this.logs = result.data.listLogs.items;
      
      this.analyticsService.trackAction('logs-loaded', 'analytics-dashboard', { count: this.logs.length });
    } catch (error) {
      this.analyticsService.trackError('failed-to-load-logs', 'analytics-dashboard', { error: error.message });
    }
  }

  private setupSubscription(): void {
    try {
      // In a real implementation, this would set up a WebSocket subscription
      // For now, we'll simulate it with periodic polling
      this.subscription = setInterval(() => {
        this.loadLogs();
      }, 30000); // Refresh every 30 seconds

      this.analyticsService.trackAction('subscription-setup', 'analytics-dashboard');
    } catch (error) {
      this.analyticsService.trackError('failed-to-setup-subscription', 'analytics-dashboard', { error: error.message });
    }
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
    this.currentPage = 1;
    this.analyticsService.trackAction('filters-cleared', 'analytics-dashboard');
  }

  exportLogs(): void {
    try {
      const csvData = this.filteredLogs.map(log => ({
        timestamp: log.createdAt,
        user: log.user?.name || log.userId,
        component: log.component,
        action: log.action,
        level: log.level,
        metadata: JSON.stringify(log.metadata || {})
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      this.analyticsService.trackAction('logs-exported', 'analytics-dashboard', { count: csvData.length });
    } catch (error) {
      this.analyticsService.trackError('export-failed', 'analytics-dashboard', { error: error.message });
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  onSearchChange(): void {
    this.analyticsService.trackAction('search-logs', 'analytics-dashboard');
  }

  onFilterChange(filterType: string): void {
    this.analyticsService.trackAction('filter-' + filterType, 'analytics-dashboard');
  }
}