import { createHttpWebExtBackend } from 'ng-web-ext-http/background';

browser.runtime.onConnect.addListener(createHttpWebExtBackend());
