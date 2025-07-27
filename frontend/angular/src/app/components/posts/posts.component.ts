import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-purple-100 p-4 rounded">
      <h3 class="text-lg font-bold text-purple-800">✅ Posts Component Loaded!</h3>
      <p class="text-purple-700">Posts page is working correctly.</p>
      <p class="text-sm text-purple-600 mt-2">Ready to manage posts!</p>
    </div>
  `
})
export class PostsComponent {
  constructor() {
    console.log('Posts component loaded successfully!');
  }
}
