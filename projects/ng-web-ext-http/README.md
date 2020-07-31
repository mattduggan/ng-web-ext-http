# ng-web-ext-http

Angular HttpBackend for Extensions.

## Summary

[Chromium](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches) has announced changes to its extensions, 
disallowing cross-origin fetches from content scripts to improve security. As a result, requests should be relayed through the 
extension background page.

This library contains a replacement for `HttpBackend`, `HttpWebExtBackend`, and a listener factory, `createHttpWebExtBackendListener`, allowing
requests and responses to be relayed through the background page.

## Installation

```
npm i ng-web-ext-http
```

## Usage

Import `HttpWebExtModule` in a content script's `AppModule` _after_ `HttpClientModule`:

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { HttpWebExtModule } from 'ng-web-ext-http/content';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    HttpWebExtModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

In the background script, create and register the listener:

```
import { createHttpWebExtBackendListener } from 'ng-web-ext-http/background';

chrome.runtime.onConnect.addListener(createHttpWebExtBackendListener());
```

## Demo

Clone the repository, build and link the library, and build the extension demo:

```
git clone git@github.com:mattduggan/ng-web-ext-http.git
cd ng-web-ext-http

npm install

# build the library
npm run build

# symlink the library to the global folder
cd dist/ng-web-ext-http
npm link

# create a symbolic link for the project root
cd ../..
npm link ng-web-ext-http

# build the extension demo
npm run build:demo
```

Load the unpacked extension from `dist/demo`. 
Head to https://www.example.com and check the console output. 
