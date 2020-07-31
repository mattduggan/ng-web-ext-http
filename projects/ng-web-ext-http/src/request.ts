import { HttpRequest } from '@angular/common/http';
import { SerializedHttpHeaders, serializeHttpHeaders } from './headers';

export type SerializedHttpRequest =
  Pick<HttpRequest<any>, 'method' | 'reportProgress' | 'responseType' | 'url' | 'urlWithParams' | 'withCredentials'>
  & {
    body: ArrayBuffer | Blob | FormData | string | null;
    headers: SerializedHttpHeaders;
  };

export function serializeHttpRequest(req: HttpRequest<any>): SerializedHttpRequest {
  return {
    ...req,
    body: req.serializeBody(),
    headers: serializeHttpHeaders(req.headers)
  };
}
