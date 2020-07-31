import {
  HttpErrorResponse,
  HttpHeaderResponse,
  HttpProgressEvent,
  HttpResponse,
  HttpResponseBase,
  HttpSentEvent
} from '@angular/common/http';
import { SerializedHttpHeaders, serializeHttpHeaders } from './headers';

export type SerializedHttpResponseBase =
  Pick<HttpResponseBase, 'ok' | 'status' | 'statusText' | 'type' |'url'>
  & { headers: SerializedHttpHeaders; };

export type SerializedHttpHeaderResponse =
  SerializedHttpResponseBase
  & Pick<HttpHeaderResponse, 'type'>;

export type SerializedHttpResponse =
  SerializedHttpResponseBase
  & Pick<HttpResponse<any>, 'type'>
  & { body: string | null; };

export type SerializedHttpErrorResponse =
  SerializedHttpResponseBase
  & Pick<HttpErrorResponse, 'name' | 'message' | 'error'>
  & Pick<HttpResponse<any>, 'type'>
  & { headers: SerializedHttpHeaders; };

export function serializeHttpResponse(res: HttpHeaderResponse): SerializedHttpHeaderResponse;
export function serializeHttpResponse(res: HttpResponse<any>): SerializedHttpResponse;
export function serializeHttpResponse(res: HttpErrorResponse): SerializedHttpErrorResponse;
export function serializeHttpResponse(res) {
  return {
    ...res,
    headers: serializeHttpHeaders(res.headers)
  };
}

export type HttpWebExtBackendResponse =
  HttpSentEvent
  | HttpProgressEvent
  | SerializedHttpHeaderResponse
  | SerializedHttpResponse
  | SerializedHttpErrorResponse;
