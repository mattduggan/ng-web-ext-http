import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

const appRoot = document.createElement('app-root');
document.body.appendChild(appRoot);

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
