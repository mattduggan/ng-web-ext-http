import { createHttpWebExtBackend } from 'ng-web-ext-http/background';

chrome.runtime.onConnect.addListener(createHttpWebExtBackend());
