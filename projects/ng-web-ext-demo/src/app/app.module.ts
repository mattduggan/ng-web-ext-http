import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpBackend, HttpClientModule, HttpHeaders } from '@angular/common/http';

import { AppComponent } from './app.component';
import { HttpWebExtRelay } from './http-web-ext-relay.service';

import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest
} from '@angular/common/http';

import { Observable } from 'rxjs';

// @ts-ignore
/*HttpHeaders.prototype.toJSON = function toJSON(): string {
  console.log(this);
  return JSON.stringify({foo: 'bar'});
};*/

/** Pass untouched request through to the next request handler. */
@Injectable()
export class NoopInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler):
    Observable<HttpEvent<any>> {
    const authReq = req.clone({
      setHeaders: { Authorization: 'token' }
    });
    //@ts-ignore
    authReq.headers.forEach(console.log);
    console.log(authReq);
    return next.handle(authReq);
  }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    HttpWebExtRelay,
    { provide: HttpBackend, useExisting: HttpWebExtRelay },
    { provide: HTTP_INTERCEPTORS, useClass: NoopInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
