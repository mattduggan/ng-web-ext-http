import { HttpHeaders } from '@angular/common/http';

export type SerializedHttpHeaders = { [name: string]: string };

export function serializeHttpHeaders(headers: HttpHeaders): SerializedHttpHeaders {
  const serialized = {};
  // @ts-ignore
  headers.forEach((name, values) => serialized[name] = values.join(','));
  return serialized;
}
