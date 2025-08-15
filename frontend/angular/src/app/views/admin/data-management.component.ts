import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { GraphQLClientService } from '../../graphql/client';

@Component({
  selector: 'app-data-management',
  templateUrl: './data-management.component.html',
  styleUrls: ['./data-management.component.css']
})
export class DataManagementComponent implements OnInit {
  availableModels = ['User', 'Post', 'Setting', 'Log'];
  selectedModel = '';
  modelData: any[] = [];
  searchQuery = '';
  selectedRecords: string[] = [];
  sortField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 25;
  exportFormat: 'CSV' | 'JSON' = 'CSV';

  // Modals
  showCreateModal = false;
  showEditModal = false;
  formData: any = {};
  editingRecord: any = null;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.analyticsService.trackView('data-management');
  }

  get modelFields(): string[] {
    if (this.modelData.length === 0) return [];
    return Object.keys(this.modelData[0]).filter(key => key !== '__typename');
  }

  get editableFields(): string[] {
    return this.modelFields.filter(field => field !== 'id' && !field.includes('_local'));
  }

  get requiredFields(): string[] {
    return ['name', 'email', 'title', 'key', 'type'].filter(field => 
      this.editableFields.includes(field)
    );
  }

  get filteredRecords(): any[] {
    let filtered = this.modelData;

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        Object.values(record).some(value => 
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[this.sortField];
      const bVal = b[this.sortField];
      
      if (this.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }

  get paginatedRecords(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRecords.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRecords.length / this.pageSize);
  }

  get allSelected(): boolean {
    return this.paginatedRecords.length > 0 && 
           this.selectedRecords.length === this.paginatedRecords.length;
  }

  private getModelFields(model: string): string {
    const commonFields = 'id createdAt updatedAt';
    
    switch (model) {
      case 'User':
        return `${commonFields} userId name email role bio`;
      case 'Post':
        return `${commonFields} title content userId published`;
      case 'Setting':
        return `${commonFields} type key value entityId description isActive`;
      case 'Log':
        return `${commonFields} userId action component level metadata user { id name }`;
      default:
        return commonFields;
    }
  }

  async onModelChange(): Promise<void> {
    await this.loadModelData();
  }

  async loadModelData(): Promise<void> {
    if (!this.selectedModel) return;

    try {
      const query = `
        query List${this.selectedModel}s {
          list${this.selectedModel}s {
            ${this.getModelFields(this.selectedModel)}
          }
        }
      `;

      const result = await this.graphqlClient.query(query);
      this.modelData = result.data[`list${this.selectedModel}s`] || [];
      this.selectedRecords = [];
      this.currentPage = 1;
      
      this.analyticsService.trackAction('model-data-loaded', 'data-management', { 
        model: this.selectedModel, 
        count: this.modelData.length 
      });
    } catch (error) {
      this.analyticsService.trackError('failed-to-load-model-data', 'data-management', { 
        model: this.selectedModel, 
        error: error.message 
      });
    }
  }

  refreshData(): void {
    this.loadModelData();
    this.analyticsService.trackAction('data-refreshed', 'data-management', { model: this.selectedModel });
  }

  exportData(): void {
    try {
      const data = this.filteredRecords;
      
      if (this.exportFormat === 'CSV') {
        const csv = [
          this.modelFields.join(','),
          ...data.map(record => 
            this.modelFields.map(field => {
              const value = record[field];
              return typeof value === 'object' ? JSON.stringify(value) : value;
            }).map(val => `"${val}"`).join(',')
          )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedModel}-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedModel}-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      this.analyticsService.trackAction('data-exported', 'data-management', { 
        model: this.selectedModel, 
        format: this.exportFormat,
        count: data.length 
      });
    } catch (error) {
      this.analyticsService.trackError('export-failed', 'data-management', { error: error.message });
    }
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedRecords = [];
    } else {
      this.selectedRecords = this.paginatedRecords.map(record => record.id);
    }
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.analyticsService.trackAction('data-sorted', 'data-management', { field, direction: this.sortDirection });
  }

  editRecord(record: any): void {
    this.editingRecord = record;
    this.formData = { ...record };
    this.showEditModal = true;
    this.analyticsService.trackAction('edit-record-opened', 'data-management', { model: this.selectedModel, id: record.id });
  }

  async deleteRecord(record: any): Promise<void> {
    if (!confirm(`Are you sure you want to delete this ${this.selectedModel}?`)) {
      return;
    }

    try {
      const mutation = `
        mutation Delete${this.selectedModel}($input: Delete${this.selectedModel}Input!) {
          delete${this.selectedModel}(input: $input) {
            id
          }
        }
      `;

      await this.graphqlClient.query(mutation, { input: { id: record.id } });
      await this.loadModelData();
      this.analyticsService.trackAction('record-deleted', 'data-management', { model: this.selectedModel, id: record.id });
    } catch (error) {
      this.analyticsService.trackError('delete-failed', 'data-management', { error: error.message });
    }
  }

  async impersonateUser(user: any): Promise<void> {
    if (!confirm(`Impersonate user ${user.name}? This will log you in as this user.`)) {
      return;
    }

    try {
      this.analyticsService.trackAction('user-impersonation', 'data-management', { 
        targetUserId: user.id, 
        targetUserName: user.name 
      });
      
      window.location.href = '/';
    } catch (error) {
      this.analyticsService.trackError('impersonation-failed', 'data-management', { error: error.message });
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.formData = {};
    this.editingRecord = null;
  }

  onRecordSelectionChange(recordId: string, selected: boolean): void {
    if (selected) {
      this.selectedRecords.push(recordId);
    } else {
      this.selectedRecords = this.selectedRecords.filter(id => id !== recordId);
    }
  }

  isRecordSelected(recordId: string): boolean {
    return this.selectedRecords.includes(recordId);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
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
}