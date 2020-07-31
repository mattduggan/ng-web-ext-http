import { InjectionToken } from '@angular/core';
import { PORT_NAME } from './constants';

export const HTTP_WEB_EXT_BACKEND_PORT = new InjectionToken(
  'The name of Port created by HttpWebExtBackend',
  { providedIn: 'root', factory: () => PORT_NAME }
  );
