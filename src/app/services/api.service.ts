import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type HttpParamsType = HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  private authToken: string | null = null;
  private requestTimeout = 15000;

  constructor(private http: HttpClient) {}

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.authToken) {
      headers = headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    return headers;
  }

  private handleError(error: HttpErrorResponse | TimeoutError) {
    if (error instanceof TimeoutError) {
      const timeoutError = new Error('La requête a expiré. Vérifiez que le serveur backend est démarré.') as any;
      timeoutError.statusCode = 0;
      console.error('API Timeout:', error);
      return throwError(() => timeoutError);
    }

    let errorMessage = 'An error occurred';
    let errorData: unknown = null;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = error.error?.error || error.message;
      errorData = error.error;
    }
    
    console.error('API Error:', errorMessage, error);
    
    // Create error with additional context
    const apiError = new Error(errorMessage) as any;
    apiError.statusCode = error.status;
    apiError.errorResponse = errorData;
    apiError.error = error.error;
    
    return throwError(() => apiError);
  }

  get<T>(endpoint: string, params?: HttpParamsType): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params
    }).pipe(timeout(this.requestTimeout), catchError(this.handleError));
  }

  /** `timeoutMs` overrides the default 15 s for slow calls (e.g. AI recipe import). */
  post<T>(endpoint: string, data: unknown, timeoutMs = this.requestTimeout): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers: this.getHeaders()
    }).pipe(timeout(timeoutMs), catchError(this.handleError));
  }

  put<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers: this.getHeaders()
    }).pipe(timeout(this.requestTimeout), catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(timeout(this.requestTimeout), catchError(this.handleError));
  }

  // Convert Observable to Promise for easier use in services
  getAsync<T>(endpoint: string, params?: HttpParamsType): Promise<T> {
    return new Promise((resolve, reject) => {
      this.get<T>(endpoint, params).subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error)
      });
    });
  }

  postAsync<T>(endpoint: string, data: unknown, timeoutMs?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      this.post<T>(endpoint, data, timeoutMs).subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error)
      });
    });
  }

  putAsync<T>(endpoint: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.put<T>(endpoint, data).subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error)
      });
    });
  }

  deleteAsync<T>(endpoint: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.delete<T>(endpoint).subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error)
      });
    });
  }
}
