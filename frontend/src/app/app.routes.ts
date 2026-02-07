import { Routes } from '@angular/router';
import { TargetsComponent } from './pages/targets/targets';
import { EditorComponent } from './pages/editor/editor.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'editor', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    {
        path: 'editor',
        component: EditorComponent,
        canActivate: [authGuard]
    },
    {
        path: 'targets',
        component: TargetsComponent,
        canActivate: [authGuard]
    }
];
