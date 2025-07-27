import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NavbarComponent } from './components/navbar/navbar.component';
import { LoadingComponent } from './components/loading/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, LoadingComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {
  loading = true;
  isLoginPage = false;
  isMobile = false;

  constructor(private router: Router) {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }

  ngOnInit() {
    console.log('App initialized, current route:', this.router.url);
    
    // Listen to route changes to determine if we're on login page
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isLoginPage = event.url === '/login';
      });

    // Set initial login page state
    this.isLoginPage = this.router.url === '/login';
    
    // Simulate loading delay (similar to Vue implementation)
    setTimeout(() => {
      this.loading = false;
      console.log('App loading complete');
    }, 1000);
  }

  private checkMobile() {
    this.isMobile = window.innerWidth < 768;
  }
}
