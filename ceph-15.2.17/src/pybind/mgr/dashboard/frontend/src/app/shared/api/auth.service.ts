import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Credentials } from '../models/credentials';
import { LoginResponse } from '../models/login-response';
import { AuthStorageService } from '../services/auth-storage.service';
import { ApiModule } from './api.module';

@Injectable({
  providedIn: ApiModule
})
export class AuthService {
  constructor(
    private authStorageService: AuthStorageService,
    private http: HttpClient,
    private router: Router
  ) {}

  check(token: string) {
    return this.http.post('api/auth/check', { token: token });
  }

  login(credentials: Credentials): Observable<LoginResponse> {
    return this.http.post('api/auth', credentials).pipe(
      tap((resp: LoginResponse) => {
        this.authStorageService.set(
          resp.username,
          resp.permissions,
          resp.sso,
          resp.pwdExpirationDate,
          resp.pwdUpdateRequired
        );
      })
    );
  }

  logout(callback: Function = null) {
    return this.http.post('api/auth/logout', null).subscribe((resp: any) => {
      this.authStorageService.remove();
      this.router.navigate(['/login'], { skipLocationChange: true });
      if (callback) {
        callback();
      }
      window.location.replace(resp.redirect_url);
    });
  }
}
