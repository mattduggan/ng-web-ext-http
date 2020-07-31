import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpHeaderResponse,
  HttpHeaders,
  HttpRequest, HttpResponse
} from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

import { HTTP_WEB_EXT_BACKEND_PORT } from './tokens';
import { serializeHttpRequest } from './request';
import { HttpWebExtBackendResponse, SerializedHttpErrorResponse } from './response';
/**
 * Creates a `runtime.Port` using `runtime.connect`, relaying `HttpRequest` to the background page and `HttpEvent` to
 * the content script.
 */
@Injectable({
  providedIn: 'root'
})
export class HttpWebExtBackend {
  constructor(@Inject(HTTP_WEB_EXT_BACKEND_PORT) private readonly portName: string) {}

  /**
   * Processes a request and returns a stream of response events.
   * @param req The request object.
   * @returns An observable of the response events.
   */
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    // TODO handle this module
    if (req.method === 'JSONP') {
      throw new Error(`Attempted to construct Jsonp request without JsonpClientModule installed.`);
    }

    return new Observable((observer: Observer<HttpEvent<any>>) => {
      const port = browser.runtime.connect({ name: this.portName });

      port.onDisconnect.addListener(() => {
        // Fired when the port is disconnected from the other end(s).
        // runtime.lastError may be set if the port was disconnected by an error.
        // If the port is closed via disconnect, then this event is only fired on the other end.
        observer.error(new HttpErrorResponse({ error: browser.runtime.lastError }));
      });

      port.onMessage.addListener((message: HttpWebExtBackendResponse) => {
        switch(message.type) {
          case HttpEventType.Sent:
          case HttpEventType.UploadProgress:
          case HttpEventType.DownloadProgress:
            observer.next(message);
            break;
          case HttpEventType.ResponseHeader:
            observer.next(new HttpHeaderResponse({ ...message, headers: new HttpHeaders(message.headers) }));
            break;
          case HttpEventType.Response:
            if ((message as SerializedHttpErrorResponse).error) {
              observer.error(new HttpErrorResponse({ ...message, headers: new HttpHeaders(message.headers) }));
            } else {
              observer.next(new HttpResponse({ ...message, headers: new HttpHeaders(message.headers) }));
              observer.complete();
            }
            port.disconnect();
            break;
        }
      });

      // Prepare the request.
      if (!req.headers.has('Accept')) {
        req.headers.set('Accept', 'application/json, text/plain, */*');
      }

      if (!req.headers.has('Content-Type')) {
        const detectedType = req.detectContentTypeHeader();
        // Sometimes Content-Type detection fails.
        if (detectedType !== null) {
          req.headers['Content-Type'] = detectedType;
        }
      }

      // Relay the serialized request.
      port.postMessage(serializeHttpRequest(req));

      // This is the return from the Observable function, which is the
      // request cancellation handler.
      return () => {
        port.disconnect();
      };
    });
  }
}
