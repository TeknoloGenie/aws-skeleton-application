import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../services/analytics.service';
import { GraphQLClientService } from '../../graphql/client';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  editingRecord: any = null;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.analyticsService.trackView('data-management');
  }

  async onModelChange(): Promise<void> {
    if (!this.selectedModel) return;
    
    try {
      this.isLoading = true;
      this.modelData = [];
      this.selectedRecords = [];
      
      const query = `
        query List${this.selectedModel}s {
          list${this.selectedModel}s {
            ${this.getModelFields(this.selectedModel)}
          }
        }
      `;

      const result = await this.graphqlClient.query(query);
      
      if (result.data?.[`list${this.selectedModel}s`]) {
        this.modelData = result.data[`list${this.selectedModel}s`];
      }
      
      this.analyticsService.trackAction('model-selected', 'data-management', { 
        model: this.selectedModel,
        recordCount: this.modelData.length 
      });
    } catch (error: any) {
      this.analyticsService.trackError('failed-to-load-model', 'data-management', { 
        model: this.selectedModel,
        error: error?.message || 'Unknown error'
      });
    } finally {
      this.isLoading = false;
    }
  }

  refreshData(): void {
    if (this.selectedModel) {
      this.onModelChange();
    }
  }

  private getModelFields(model: string): string {
    const commonFields = 'id createdAt updatedAt';
    
    switch (model) {
      case 'User':
        return `${commonFields} userId cognitoId name email bio role`;
      case 'Post':
        return `${commonFields} title content userId published user { id name email }`;
      case 'Setting':
        return `${commonFields} key value category description userId`;
      case 'Log':
        return `${commonFields} userId action component level metadata user { id name email }`;
      default:
        return commonFields;
    }
  }

  get modelFields(): string[] {
    if (!this.selectedModel) return [];
    
    const fields = this.getModelFields(this.selectedModel).split(' ');
    return fields.filter(field => !field.includes('{') && !field.includes('}'));
  }

  get paginatedRecords(): any[] {
    let filtered = this.modelData;
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        Object.values(record).some(value => 
          String(value).toLowerCase().includes(query)
        )
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[this.sortField];
      const bVal = b[this.sortField];
      
      if (this.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.modelData.length / this.pageSize);
  }

  get allSelected(): boolean {
    return this.selectedRecords.length === this.paginatedRecords.length && this.paginatedRecords.length > 0;
  }

  isRecordSelected(recordId: string): boolean {
    return this.selectedRecords.includes(recordId);
  }

  onRecordSelectionChange(recordId: string, selected: boolean): void {
    if (selected) {
      if (!this.selectedRecords.includes(recordId)) {
        this.selectedRecords.push(recordId);
      }
    } else {
      this.selectedRecords = this.selectedRecords.filter(id => id !== recordId);
    }
  }

  editRecord(record: any): void {
    this.openEditModal(record);
  }

  async deleteRecord(record: any): Promise<void> {
    if (!confirm(`Are you sure you want to delete this ${this.selectedModel}?`)) {
      return;
    }
    
    try {
      const mutation = `
        mutation Delete${this.selectedModel}($id: ID!) {
          delete${this.selectedModel}(id: $id) {
            id
          }
        }
      `;
      
      await this.graphqlClient.query(mutation, { id: record.id });
      await this.onModelChange();
      
      this.analyticsService.trackAction('record-deleted', 'data-management', {
        model: this.selectedModel,
        id: record.id
      });
    } catch (error: any) {
      this.analyticsService.trackError('delete-failed', 'data-management', { error: error?.message || 'Unknown error' });
    }
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.analyticsService.trackAction('sort-changed', 'data-management', {
      field,
      direction: this.sortDirection
    });
  }

  toggleRecordSelection(recordId: string): void {
    const index = this.selectedRecords.indexOf(recordId);
    if (index > -1) {
      this.selectedRecords.splice(index, 1);
    } else {
      this.selectedRecords.push(recordId);
    }
  }

  selectAllRecords(): void {
    if (this.selectedRecords.length === this.paginatedRecords.length) {
      this.selectedRecords = [];
    } else {
      this.selectedRecords = this.paginatedRecords.map(record => record.id);
    }
  }

  toggleSelectAll(): void {
    this.selectAllRecords();
  }

  async exportData(): Promise<void> {
    try {
      this.analyticsService.trackAction('export-data', 'data-management', {
        model: this.selectedModel,
        format: this.exportFormat,
        recordCount: this.modelData.length
      });

      const dataToExport = this.selectedRecords.length > 0 
        ? this.modelData.filter(record => this.selectedRecords.includes(record.id))
        : this.modelData;

      if (this.exportFormat === 'CSV') {
        this.exportAsCSV(dataToExport);
      } else {
        this.exportAsJSON(dataToExport);
      }
    } catch (error: any) {
      this.analyticsService.trackError('export-failed', 'data-management', { error: error?.message || 'Unknown error' });
    }
  }

  private exportAsCSV(data: any[]): void {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }).join(',')
      )
    ].join('\n');
    
    this.downloadFile(csvContent, `${this.selectedModel}-export.csv`, 'text/csv');
  }

  private exportAsJSON(data: any[]): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${this.selectedModel}-export.json`, 'application/json');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedRecords.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${this.selectedRecords.length} record(s)?`)) {
      return;
    }
    
    try {
      this.analyticsService.trackAction('bulk-delete', 'data-management', {
        model: this.selectedModel,
        count: this.selectedRecords.length
      });

      // Delete each selected record
      for (const recordId of this.selectedRecords) {
        const mutation = `
          mutation Delete${this.selectedModel}($id: ID!) {
            delete${this.selectedModel}(id: $id) {
              id
            }
          }
        `;
        
        await this.graphqlClient.query(mutation, { id: recordId });
      }
      
      // Refresh the data
      await this.onModelChange();
      this.selectedRecords = [];
      
    } catch (error: any) {
      this.analyticsService.trackError('delete-failed', 'data-management', { error: error?.message || 'Unknown error' });
    }
  }

  async impersonateUser(userId: string): Promise<void> {
    try {
      this.analyticsService.trackAction('user-impersonation', 'data-management', { userId });
      
      // Implement user impersonation logic
      console.log('Impersonating user:', userId);
      
    } catch (error: any) {
      this.analyticsService.trackError('impersonation-failed', 'data-management', { error: error?.message || 'Unknown error' });
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.analyticsService.trackAction('page-size-changed', 'data-management', { pageSize: this.pageSize });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  formatValue(value: any): string {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.analyticsService.trackAction('create-modal-opened', 'data-management', { model: this.selectedModel });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  openEditModal(record: any): void {
    this.editingRecord = { ...record };
    this.showEditModal = true;
    this.analyticsService.trackAction('edit-modal-opened', 'data-management', { 
      model: this.selectedModel,
      recordId: record.id 
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingRecord = null;
  }

  async saveRecord(): Promise<void> {
    // Implementation for saving new/edited records
    this.analyticsService.trackAction('record-saved', 'data-management', { model: this.selectedModel });
    this.closeCreateModal();
    this.closeEditModal();
    this.refreshData();
  }
}
