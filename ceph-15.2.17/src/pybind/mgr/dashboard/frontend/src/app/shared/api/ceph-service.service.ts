import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { Daemon } from '../models/daemon.interface';
import { CephServiceSpec } from '../models/service.interface';
import { ApiModule } from './api.module';

@Injectable({
  providedIn: ApiModule
})
export class CephServiceService {
  private url = 'api/service';

  constructor(private http: HttpClient) {}

  list(serviceName?: string): Observable<CephServiceSpec[]> {
    const options = serviceName
      ? { params: new HttpParams().set('service_name', serviceName) }
      : {};
    return this.http.get<CephServiceSpec[]>(this.url, options);
  }

  getDaemons(serviceName?: string): Observable<Daemon[]> {
    return this.http.get<Daemon[]>(`${this.url}/${serviceName}/daemons`);
  }

  create(serviceSpec: { [key: string]: any }) {
    const serviceName = serviceSpec['service_id']
      ? `${serviceSpec['service_type']}.${serviceSpec['service_id']}`
      : serviceSpec['service_type'];
    return this.http.post(
      this.url,
      {
        service_name: serviceName,
        service_spec: serviceSpec
      },
      { observe: 'response' }
    );
  }

  delete(serviceName: string) {
    return this.http.delete(`${this.url}/${serviceName}`, { observe: 'response' });
  }

  getKnownTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/known_types`);
  }
}
