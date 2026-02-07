import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { AdminComponent } from './pages/admin-dashboard/admin-dashboard'; 
import { ProgrammerDashboardComponent } from './pages/programmer-dashboard/programmer-dashboard';
import { LoginComponent } from './pages/login/login';
import { PortfolioViewComponent } from './pages/portfolio-view/portfolio-view';

import { publicGuard, adminGuard, programmerGuard, authGuard, authenticatedGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent, canActivate: [publicGuard] },
  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },

  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [authGuard] 
  },

  { 
    path: 'portfolio/:id',  
    component: PortfolioViewComponent,
    canActivate: [authenticatedGuard]
  },

  { 
    path: 'admin', 
    component: AdminComponent,
    canActivate: [adminGuard] 
  },

  { 
    path: 'programmer', 
    component: ProgrammerDashboardComponent,
    canActivate: [programmerGuard] 
  },

  { path: '**', redirectTo: '' }
];