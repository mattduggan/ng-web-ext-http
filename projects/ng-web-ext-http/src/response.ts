import { SerializedHttpHeaders } from './headers';

export const enum SerializedHttpEventType {
  Sent = 0,
  UploadProgress = 1,
  ResponseHeader = 2,
  DownloadProgress = 3,
  Response = 4
}

export type SerializedHttpSentEvent = {
  type: SerializedHttpEventType.Sent;
}

export type SerializedHttpProgressEvent = {
  type: SerializedHttpEventType.DownloadProgress | SerializedHttpEventType.UploadProgress;
  loaded: number;
  total?: number;
};

export type SerializedHttpDownloadProgressEvent = SerializedHttpProgressEvent
  & { type: SerializedHttpEventType.DownloadProgress; partialText?: string };

export type SerializedHttpUploadProgressEvent = SerializedHttpProgressEvent
  & { type: SerializedHttpEventType.UploadProgress; };

export type SerializedHttpResponseBase = {
  headers: SerializedHttpHeaders;
  ok: boolean;
  status: number;
  statusText: string;
  type: SerializedHttpEventType.ResponseHeader | SerializedHttpEventType.Response;
  url: string;
};

export type SerializedHttpHeaderResponse = SerializedHttpResponseBase
  & { type: SerializedHttpEventType.ResponseHeader; };

export type SerializedHttpResponse = SerializedHttpResponseBase
  & {
    body: string | null;
    type: SerializedHttpEventType.Response;
  };

export type SerializedHttpErrorResponse = SerializedHttpResponseBase
  & {
    error: any | null;
    message: string;
    name: 'HttpErrorResponse';
    type: SerializedHttpEventType.Response;
  };

export type HttpWebExtBackendResponse = SerializedHttpSentEvent
  | SerializedHttpProgressEvent
  | SerializedHttpHeaderResponse
  | SerializedHttpResponse
  | SerializedHttpErrorResponse;
