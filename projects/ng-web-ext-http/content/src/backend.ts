import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaderResponse,
  HttpHeaders,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  PORT_NAME,
  HttpWebExtBackendResponse,
  SerializedHttpErrorResponse,
  SerializedHttpEventType,
  serializeHttpRequest
} from 'ng-web-ext-http';
import { Observable, Observer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpWebExtBackend {
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    // TODO handle this module
    if (req.method === 'JSONP') {
      throw new Error(`Attempted to construct Jsonp request without JsonpClientModule installed.`);
    }

    return new Observable((observer: Observer<HttpEvent<any>>) => {
      const port = chrome.runtime.connect({ name: PORT_NAME });

      port.onDisconnect.addListener(() => {
        observer.error(new HttpErrorResponse({ error: chrome.runtime.lastError }));
      });

      port.onMessage.addListener((message: HttpWebExtBackendResponse) => {
        switch(message.type) {
          case SerializedHttpEventType.ResponseHeader:
            observer.next(new HttpHeaderResponse({ ...message, headers: new HttpHeaders(message.headers) }));
            break;
          case SerializedHttpEventType.Response:
            if ((message as SerializedHttpErrorResponse).error) {
              observer.error(new HttpErrorResponse({ ...message, headers: new HttpHeaders(message.headers) }));
            } else {
              observer.next(new HttpResponse({ ...message, headers: new HttpHeaders(message.headers) }));
              observer.complete();
            }
            port.disconnect();
            break;
          default:
            // @ts-ignore
            observer.next(message);
            break;
        }
      });

      if (!req.headers.has('Accept')) {
        req.headers.set('Accept', 'application/json, text/plain, */*');
      }

      if (!req.headers.has('Content-Type')) {
        const detectedType = req.detectContentTypeHeader();
        if (detectedType !== null) {
          req.headers['Content-Type'] = detectedType;
        }
      }

      port.postMessage(serializeHttpRequest(req));

      return () => {
        port.disconnect();
      };
    });
  }
}
