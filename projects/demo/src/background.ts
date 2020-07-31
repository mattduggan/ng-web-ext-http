import { createHttpWebExtBackendListener } from 'ng-web-ext-http/background';

chrome.runtime.onConnect.addListener(createHttpWebExtBackendListener());
