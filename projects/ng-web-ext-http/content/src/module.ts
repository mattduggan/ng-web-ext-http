import { NgModule } from '@angular/core';
import { HttpBackend } from '@angular/common/http';
import { HttpWebExtBackend } from './backend';

@NgModule({
  providers: [
    HttpWebExtBackend,
    { provide: HttpBackend, useExisting: HttpWebExtBackend }
  ]
})
export class HttpWebExtModule {
}
