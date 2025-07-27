import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-green-100 p-4 rounded">
      <h3 class="text-lg font-bold text-green-800">✅ Dashboard Component Loaded!</h3>
      <p class="text-green-700">This means routing is working correctly.</p>
      <p class="text-sm text-green-600 mt-2">Current time: {{ currentTime }}</p>
    </div>
  `
})
export class DashboardComponent {
  currentTime = new Date().toLocaleTimeString();

  constructor() {
    console.log('Dashboard component loaded successfully!');
  }
}
