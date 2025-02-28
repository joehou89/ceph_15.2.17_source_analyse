import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';

import { configureTestBed, i18nProviders } from '../../../../testing/unit-test-helper';
import { CoreModule } from '../../../core/core.module';
import { CephServiceService } from '../../../shared/api/ceph-service.service';
import { OrchestratorService } from '../../../shared/api/orchestrator.service';
import { CdTableFetchDataContext } from '../../../shared/models/cd-table-fetch-data-context';
import { Permissions } from '../../../shared/models/permissions';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';
import { SharedModule } from '../../../shared/shared.module';
import { CephModule } from '../../ceph.module';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  const fakeAuthStorageService = {
    getPermissions: () => {
      return new Permissions({ hosts: ['read'] });
    }
  };

  const services = [
    {
      service_type: 'osd',
      service_name: 'osd',
      status: {
        container_image_id: 'e70344c77bcbf3ee389b9bf5128f635cf95f3d59e005c5d8e67fc19bcc74ed23',
        container_image_name: 'docker.io/ceph/daemon-base:latest-master-devel',
        size: 3,
        running: 3,
        last_refresh: '2020-02-25T04:33:26.465699'
      }
    },
    {
      service_type: 'crash',
      service_name: 'crash',
      status: {
        container_image_id: 'e70344c77bcbf3ee389b9bf5128f635cf95f3d59e005c5d8e67fc19bcc74ed23',
        container_image_name: 'docker.io/ceph/daemon-base:latest-master-devel',
        size: 1,
        running: 1,
        last_refresh: '2020-02-25T04:33:26.465766'
      }
    }
  ];

  configureTestBed({
    imports: [
      BrowserAnimationsModule,
      CephModule,
      CoreModule,
      SharedModule,
      HttpClientTestingModule,
      RouterTestingModule,
      ToastrModule.forRoot()
    ],
    providers: [{ provide: AuthStorageService, useValue: fakeAuthStorageService }, i18nProviders],
    declarations: []
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    const orchService = TestBed.get(OrchestratorService);
    const cephServiceService = TestBed.get(CephServiceService);
    spyOn(orchService, 'status').and.returnValue(of({ available: true }));
    spyOn(cephServiceService, 'list').and.returnValue(of(services));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have columns that are sortable', () => {
    expect(
      component.columns
        // Filter the 'Expand/Collapse Row' column.
        .filter((column) => !(column.cellClass === 'cd-datatable-expand-collapse'))
        // Filter the 'Placement' column.
        .filter((column) => !(column.prop === ''))
        .every((column) => Boolean(column.prop))
    ).toBeTruthy();
  });

  it('should return all services', () => {
    component.getServices(new CdTableFetchDataContext(() => {}));
    expect(component.services.length).toBe(2);
  });

  it('should not display doc panel if orchestrator is available', () => {
    expect(component.showDocPanel).toBeFalsy();
  });
});
