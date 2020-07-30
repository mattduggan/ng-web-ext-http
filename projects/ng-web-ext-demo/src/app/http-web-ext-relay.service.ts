/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import {
  HttpBackend,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType, HttpHeaderResponse,
  HttpHeaders,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';

export type SerializedHttpRequest = {
  readonly url: string;
  readonly body: ArrayBuffer | Blob | FormData | string | null;
  readonly headers: { [header: string]: string };
  readonly reportProgress: boolean;
  readonly withCredentials: boolean;
  readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text';
  readonly method: string;
  readonly urlWithParams: string;
}

function serialize(req: HttpRequest<unknown>): SerializedHttpRequest {
  const headers = {};
  // @ts-ignore - forEach is flagged as internal
  req.headers.forEach((name, values) => headers[name] = values.join(','));

  // Add an Accept header if one isn't present already.
  if (!req.headers.has('Accept')) {
    headers['Accept'] = 'application/json, text/plain, */*';
  }

  // Auto-detect the Content-Type header if one isn't present already.
  if (!req.headers.has('Content-Type')) {
    const detectedType = req.detectContentTypeHeader();
    // Sometimes Content-Type detection fails.
    if (detectedType !== null) {
      headers['Content-Type'] = detectedType;
    }
  }

  // Set the responseType if one was requested.
  let responseType = null;
  if (req.responseType) {
    responseType = req.responseType.toLowerCase();

    // JSON responses need to be processed as text. This is because if the server
    // returns an XSSI-prefixed JSON response, the browser will fail to parse it,
    // xhr.response will be null, and xhr.responseText cannot be accessed to
    // retrieve the prefixed JSON data in order to strip the prefix. Thus, all JSON
    // is parsed by first requesting text and then applying JSON.parse.
    responseType = ((responseType !== 'json') ? responseType : 'text') as any;
  }

  return {
    url: req.url,
    // Serialize the request body if one is present. If not, this will be set to null.
    body: req.serializeBody(),
    headers,
    reportProgress: req.reportProgress,
    withCredentials: req.withCredentials,
    responseType,
    method: req.method,
    urlWithParams: req.urlWithParams
  };
}

/**
 * Uses a `Port` to relay requests through the background.
 */
@Injectable()
export class HttpWebExtRelay implements HttpBackend {
  constructor() {}

  /**
   * Processes a request and returns a stream of response events.
   * @param req The request object.
   * @returns An observable of the response events.
   */
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    // Quick check to give a better error message when a user attempts to use
    // HttpClient.jsonp() without installing the JsonpClientModule
    // TODO handle this module
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
        observer.error(chrome.runtime.lastError);
      });

      port.onMessage.addListener((message) => {
        let headers;
        if (message.headers) {
          headers = new HttpHeaders(message.headers);
        }

        switch(message.type) {
          case HttpEventType.Sent:
          case HttpEventType.UploadProgress:
          case HttpEventType.DownloadProgress:
            observer.next(message);
            break;
          case HttpEventType.ResponseHeader:
            observer.next(new HttpHeaderResponse({ ...message, headers }));
            break;
          case HttpEventType.Response:
            if (message.error) {
              observer.error(new HttpErrorResponse({ ...message, headers }));
            } else {
              observer.next(new HttpResponse({ ...message, headers }));
              // The full body has been received and delivered, no further events
              // are possible. This request is complete.
              observer.complete();
              port.disconnect();
            }
            break;
        }
      });

      // Relay the request, and notify the event stream that it was relayed.
      port.postMessage(serialize(req));

      // This is the return from the Observable function, which is the
      // request cancellation handler.
      return () => {
        // On a cancellation, disconnect the port
        port.disconnect();
      };
    });
  }
}
