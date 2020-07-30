import Port = chrome.runtime.Port;
import { XhrFactory } from '@angular/common/http';
import { SerializedHttpRequest } from './app/http-web-ext-relay.service';

export class BrowserXhr implements XhrFactory {
  constructor() {}
  build(): any {
    return <any>(new XMLHttpRequest());
  }
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 *
 */
export interface HttpJsonParseError {
  error: Error;
  text: string;
}

const XSSI_PREFIX = /^\)\]\}',?\n/;

/**
 * Determine an appropriate URL for the response, by checking either
 * XMLHttpRequest.responseURL or the X-Request-URL header.
 */
function getResponseUrl(xhr: any): string|null {
  if ('responseURL' in xhr && xhr.responseURL) {
    return xhr.responseURL;
  }
  if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
    return xhr.getResponseHeader('X-Request-URL');
  }
  return null;
}

export type SerializedHttpHeaderResponse = {
  headers: string;
  status: number;
  statusText: string;
  url: string;
  readonly type: number;
};

export type SerializedHttpResponse = {
  readonly headers: string;
  readonly status: number;
  readonly statusText: string;
  readonly url: string | null;
  readonly ok: boolean;
  readonly type: 'response' | 'response_header';
};

export type SerializedHttpErrorResponse = {

};

function createHttpWebExtBackend(xhrFactory: XhrFactory = new BrowserXhr()) {
  return (port: Port) => {
    if (port.name === '@@ng-web-ext') {
      port.onMessage.addListener((req: SerializedHttpRequest) => {
        // Start by setting up the XHR object with request method, URL, and withCredentials flag.
        const xhr = xhrFactory.build();
        xhr.open(req.method, req.urlWithParams);
        if (!!req.withCredentials) {
          xhr.withCredentials = true;
        }

        // Add all the requested headers.
        Object.keys(req.headers).forEach((name) => {
          xhr.setRequestHeader(name, req.headers[name]);
        });

        // Set the responseType if one was requested.
        if (req.responseType) {
          xhr.responseType = req.responseType;
        }

        // If progress events are enabled, response headers will be delivered
        // in two events - the HttpHeaderResponse event and the full HttpResponse
        // event. However, since response headers don't change in between these
        // two events, it doesn't make sense to parse them twice. So headerResponse
        // caches the data extracted from the response whenever it's first parsed,
        // to ensure parsing isn't duplicated.
        let headerResponse: SerializedHttpHeaderResponse|null = null;

        // partialFromXhr extracts the HttpHeaderResponse from the current XMLHttpRequest
        // state, and memoizes it into headerResponse.
        const partialFromXhr = (): SerializedHttpHeaderResponse => {
          if (headerResponse !== null) {
            return headerResponse;
          }

          // Read the response URL from the XMLHttpResponse instance and fall back on the
          // request URL.
          const url = getResponseUrl(xhr) || req.url;

          // Construct the SerializedHttpHeaderResponse and memoize it.
          return {
            headers: xhr.getAllResponseHeaders(),
            status: xhr.status,
            statusText: xhr.statusText || 'OK',
            type: 2,
            url
          };
        };

        // Next, a few closures are defined for the various events which XMLHttpRequest can
        // emit. This allows them to be unregistered as event listeners later.

        // First up is the load event, which represents a response being fully available.
        const onLoad = () => {
          // Read response state from the memoized partial data.
          let { headers, status, statusText, url } = partialFromXhr();

          // The body will be read out if present.
          let body: any|null = null;

          if (status !== 204) {
            // Use XMLHttpRequest.response if set, responseText otherwise.
            body = (typeof xhr.response === 'undefined') ? xhr.responseText : xhr.response;
          }

          // Normalize another potential bug (this one comes from CORS).
          if (status === 0) {
            status = !!body ? 200 : 0;
          }

          // ok determines whether the response will be transmitted on the event or
          // error channel. Unsuccessful status codes (not 2xx) will always be errors,
          // but a successful status code can still result in an error if the user
          // asked for JSON data and the body cannot be parsed as such.
          let ok = status >= 200 && status < 300;

          // Check whether the body needs to be parsed as JSON (in many cases the browser
          // will have done that already).
          if (req.responseType === 'json' && typeof body === 'string') {
            // Save the original body, before attempting XSSI prefix stripping.
            const originalBody = body;
            body = body.replace(XSSI_PREFIX, '');
            try {
              // Attempt the parse. If it fails, a parse error should be delivered to the user.
              body = body !== '' ? JSON.parse(body) : null;
            } catch (error) {
              // Since the JSON.parse failed, it's reasonable to assume this might not have been a
              // JSON response. Restore the original body (including any XSSI prefix) to deliver
              // a better error response.
              body = originalBody;

              // If this was an error request to begin with, leave it as a string, it probably
              // just isn't JSON. Otherwise, deliver the parsing error to the user.
              if (ok) {
                // Even though the response status was 2xx, this is still an error.
                ok = false;
                // The parse error contains the text of the body that failed to parse.
                body = { error, text: body } as HttpJsonParseError;
              }
            }
          }

          if (ok) {
            // A successful response is delivered on the event stream.
            port.postMessage({
              type: 4,
              body,
              headers,
              status,
              statusText,
              url: url || undefined
            });
          } else {
            // An unsuccessful request is delivered on the error channel.
            port.postMessage({
              type: 4,
              // The error in this case is the response body (error from the server).
              error: body,
              headers,
              status,
              statusText,
              url: url || undefined,
            });
          }
        };

        // The onError callback is called when something goes wrong at the network level.
        // Connection timeout, DNS error, offline, etc. These are actual errors, and are
        // transmitted on the error channel.
        const onError = (error: ProgressEvent) => {
          const { url } = partialFromXhr();
          const res = {
            type: 4,
            error,
            status: xhr.status || 0,
            statusText: xhr.statusText || 'Unknown Error',
            url: url || undefined,
          };
          port.postMessage(res);
        };

        // The sentHeaders flag tracks whether the HttpResponseHeaders event
        // has been sent on the stream. This is necessary to track if progress
        // is enabled since the event will be sent on only the first download
        // progress event.
        let sentHeaders = false;

        // The download progress event handler, which is only registered if
        // progress events are enabled.
        const onDownProgress = (event: ProgressEvent) => {
          // Send the HttpResponseHeaders event if it hasn't been sent already.
          if (!sentHeaders) {
            port.postMessage(partialFromXhr());
            sentHeaders = true;
          }

          // Start building the download progress event to deliver on the response
          // event stream.
          let progressEvent = {
            type: 3,
            loaded: event.loaded,
          };

          // Set the total number of bytes in the event if it's available.
          if (event.lengthComputable) {
            // @ts-ignore
            progressEvent.total = event.total;
          }

          // If the request was for text content and a partial response is
          // available on XMLHttpRequest, include it in the progress event
          // to allow for streaming reads.
          if (req.responseType === 'text' && !!xhr.responseText) {
            // @ts-ignore
            progressEvent.partialText = xhr.responseText;
          }

          // Finally, fire the event.
          port.postMessage(progressEvent);
        };

        // The upload progress event handler, which is only registered if
        // progress events are enabled.
        const onUpProgress = (event: ProgressEvent) => {
          // Upload progress events are simpler. Begin building the progress
          // event.
          let progress = {
            type: 1,
            loaded: event.loaded
          };

          // If the total number of bytes being uploaded is available, include
          // it.
          if (event.lengthComputable) {
            // @ts-ignore
            progress.total = event.total;
          }

          // Send the event.
          port.postMessage(progress);
        };

        // By default, register for load and error events.
        xhr.addEventListener('load', onLoad);
        xhr.addEventListener('error', onError);

        // Progress events are only enabled if requested.
        if (req.reportProgress) {
          // Download progress is always enabled if requested.
          xhr.addEventListener('progress', onDownProgress);

          // Upload progress depends on whether there is a body to upload.
          if (req.body !== null && xhr.upload) {
            xhr.upload.addEventListener('progress', onUpProgress);
          }
        }

        // Fire the request, and notify the event stream that it was fired.
        xhr.send(req.body!);
        port.postMessage({ type: 0 });

        port.onDisconnect.addListener(() => {
          xhr.removeEventListener('error', onError);
          xhr.removeEventListener('load', onLoad);
          if (req.reportProgress) {
            xhr.removeEventListener('progress', onDownProgress);
            if (req.body !== null && xhr.upload) {
              xhr.upload.removeEventListener('progress', onUpProgress);
            }
          }

          // Finally, abort the in-flight request.
          if (xhr.readyState !== xhr.DONE) {
            xhr.abort();
          }
        });
      });
    }
  };
}

chrome.runtime.onConnect.addListener(createHttpWebExtBackend());
