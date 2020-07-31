import { HttpBackend, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpWebExtBackend } from 'ng-web-ext-http';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    HttpWebExtBackend,
    { provide: HttpBackend, useExisting: HttpWebExtBackend }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
