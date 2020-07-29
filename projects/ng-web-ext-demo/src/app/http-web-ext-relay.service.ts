/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { HttpBackend, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';

/**
 * Uses a `Port` to relay requests through the background.
 */
@Injectable()
export class HttpWebExtRelay implements HttpBackend {
  constructor() {
  }

  /**
   * Processes a request and returns a stream of response events.
   * @param req The request object.
   * @returns An observable of the response events.
   */
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    // Quick check to give a better error message when a user attempts to use
    // HttpClient.jsonp() without installing the JsonpClientModule
    if (req.method === 'JSONP') {
      throw new Error(`Attempted to construct Jsonp request without JsonpClientModule installed.`);
    }

    // Everything happens on Observable subscription.
    return new Observable((observer: Observer<HttpEvent<any>>) => {

      const port = chrome.runtime.connect({ name: '@@ng-web-ext' });

      port.onDisconnect.addListener(() => {
        // Fired when the port is disconnected from the other end(s).
        // runtime.lastError may be set if the port was disconnected by an error.
        // If the port is closed via disconnect, then this event is only fired on the other end.
        // observer.error
        observer.error(chrome.runtime.lastError);
      });

      port.onMessage.addListener(message => {
        switch (message.action) {
          case 'SUCCESS':
            observer.next(message.payload);
            observer.complete();
            port.disconnect();
            break;
          case 'ERROR':
            observer.error(message.error);
            break;
          case 'PROGRESS':
            observer.next(message.payload);
            break;
        }
      });

      // Relay the request, and notify the event stream that it was relayed.
      port.postMessage(req);
      observer.next({ type: HttpEventType.Sent });

      // This is the return from the Observable function, which is the
      // request cancellation handler.
      return () => {
        // On a cancellation, disconnect the port
        // TODO listen to disconnect on the other end
        port.disconnect();
      };
    });
  }
}
