import { URL, fileURLToPath } from 'node:url';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import logger from '../../logger.js';

export async function createI18Next() {
  const i18nextInstance = i18next.use(Backend);

  const url = new URL('../../locales/{{lng}}/{{ns}}.json', import.meta.url);

  logger.info('[i18next] Loading locales...');
  logger.debug('[i18next] Locales path:', url, fileURLToPath(url));

  await i18nextInstance.init({
    backend: {
      loadPath: fileURLToPath(url),
    },
    ns: ['common', 'messages', 'commands', 'errors'],
    defaultNS: 'common',
    nsSeparator: '.',
    ignoreJSONStructure: false,
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
  });

  logger.info('[i18next] Loaded languages:', Object.keys(i18nextInstance.store.data));
  logger.success('[i18next] Ready!');
}
