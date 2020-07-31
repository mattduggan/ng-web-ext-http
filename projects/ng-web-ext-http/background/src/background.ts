import Port = chrome.runtime.Port;

import {
  PORT_NAME,
  XSSI_PREFIX,
  SerializedHttpDownloadProgressEvent,
  SerializedHttpEventType,
  SerializedHttpHeaderResponse,
  SerializedHttpRequest,
  SerializedHttpUploadProgressEvent
} from 'ng-web-ext-http';

export interface HttpJsonParseError {
  error: Error;
  text: string;
}

function getResponseUrl(xhr: any): string | null {
  if ('responseURL' in xhr && xhr.responseURL) {
    return xhr.responseURL;
  }
  if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
    return xhr.getResponseHeader('X-Request-URL');
  }
  return null;
}

export function createHttpWebExtBackendListener() {
  return (port: Port) => {

    if (port.name !== PORT_NAME) { return; }

    port.onMessage.addListener((req: SerializedHttpRequest) => {

      const xhr = new XMLHttpRequest();

      xhr.open(req.method, req.urlWithParams);

      if (!!req.withCredentials) {
        xhr.withCredentials = true;
      }

      Object.keys(req.headers).forEach((name) => {
        xhr.setRequestHeader(name, req.headers[name]);
      });

      if (req.responseType) {
        const responseType = req.responseType.toLowerCase();
        xhr.responseType = ((responseType !== 'json') ? responseType : 'text') as any;
      }

      let headerResponse: SerializedHttpHeaderResponse | null = null;

      const partialFromXhr = (): SerializedHttpHeaderResponse => {
        if (headerResponse !== null) {
          return headerResponse;
        }

        return headerResponse = {
          headers: xhr.getAllResponseHeaders(),
          ok: true,
          status: xhr.status,
          statusText: xhr.statusText,
          type: 2,
          url: getResponseUrl(xhr) || req.url
        };
      };

      const onLoad = () => {
        let { headers, status, statusText, url } = partialFromXhr();

        let body = null;

        if (status !== 204) {
          body = (typeof xhr.response === 'undefined') ? xhr.responseText : xhr.response;
        }

        if (status === 0) {
          status = !!body ? 200 : 0;
        }

        let ok = status >= 200 && status < 300;

        if (req.responseType === 'json' && typeof body === 'string') {
          const originalBody = body;
          body = body.replace(XSSI_PREFIX, '');
          try {
            body = body !== '' ? JSON.parse(body) : null;
          } catch (error) {
            body = originalBody;
            if (ok) {
              ok = false;
              body = { error, text: body } as HttpJsonParseError;
            }
          }
        }

        if (ok) {
          port.postMessage({
            body,
            headers,
            status,
            statusText,
            type: SerializedHttpEventType.Response,
            url: url || undefined
          });
        } else {
          port.postMessage({
            error: body,
            headers,
            status,
            statusText,
            type: SerializedHttpEventType.Response,
            url: url || undefined
          });
        }
      };

      const onError = (error: ProgressEvent) => {
        const { url } = partialFromXhr();
        port.postMessage({
          error,
          status: xhr.status || 0,
          statusText: xhr.statusText || 'Unknown Error',
          type: SerializedHttpEventType.Response,
          url: url || undefined,
        });
      };

      let sentHeaders = false;

      const onDownProgress = (event: ProgressEvent) => {
        if (!sentHeaders) {
          port.postMessage(partialFromXhr());
          sentHeaders = true;
        }

        let progressEvent: SerializedHttpDownloadProgressEvent = {
          type: SerializedHttpEventType.DownloadProgress,
          loaded: event.loaded
        };

        if (event.lengthComputable) {
          progressEvent.total = event.total;
        }

        if (req.responseType === 'text' && !!xhr.responseText) {
          progressEvent.partialText = xhr.responseText;
        }

        port.postMessage(progressEvent);
      };

      const onUpProgress = (event: ProgressEvent) => {
        let progressEvent: SerializedHttpUploadProgressEvent = {
          type: SerializedHttpEventType.UploadProgress,
          loaded: event.loaded
        };

        if (event.lengthComputable) {
          progressEvent.total = event.total;
        }

        port.postMessage(progressEvent);
      };

      xhr.addEventListener('load', onLoad);
      xhr.addEventListener('error', onError);

      if (req.reportProgress) {
        xhr.addEventListener('progress', onDownProgress);

        if (req.body !== null && xhr.upload) {
          xhr.upload.addEventListener('progress', onUpProgress);
        }
      }

      xhr.send(req.body!);
      port.postMessage({ type: SerializedHttpEventType.Sent });

      port.onDisconnect.addListener(() => {
        xhr.removeEventListener('error', onError);
        xhr.removeEventListener('load', onLoad);

        if (req.reportProgress) {
          xhr.removeEventListener('progress', onDownProgress);

          if (req.body !== null && xhr.upload) {
            xhr.upload.removeEventListener('progress', onUpProgress);
          }
        }

        if (xhr.readyState !== xhr.DONE) {
          xhr.abort();
        }
      });
    });
  };
}
