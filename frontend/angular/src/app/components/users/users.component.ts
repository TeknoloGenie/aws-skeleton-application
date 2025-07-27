import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-blue-100 p-4 rounded">
      <h3 class="text-lg font-bold text-blue-800">✅ Users Component Loaded!</h3>
      <p class="text-blue-700">Users page is working correctly.</p>
      <p class="text-sm text-blue-600 mt-2">Component initialized at: {{ initTime }}</p>
    </div>
  `
})
export class UsersComponent {
  initTime = new Date().toLocaleTimeString();

  constructor() {
    console.log('Users component loaded successfully!');
  }
}
