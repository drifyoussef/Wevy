import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () => import('../home/home.page').then(m => m.HomePage)
      },
      {
        path: 'tasks',
        loadComponent: () => import('../home/tasks.page').then(m => m.TasksPage)
      },
      {
        path: 'shopping',
        loadComponent: () => import('../shopping/shopping.page').then(m => m.ShoppingPage)
      },
      {
        path: 'library',
        loadComponent: () => import('../library/library.page').then(m => m.LibraryPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: 'add-recipe',
        loadComponent: () => import('../add-recipe/add-recipe.page').then(m => m.AddRecipePage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];
