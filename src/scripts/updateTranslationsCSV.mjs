/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import csv from '@fast-csv/format';
import path from 'path';
import { fileURLToPath } from 'url';
import csvtojson from 'csvtojson';
// eslint-disable-next-line node/no-restricted-import
import fs from 'fs';
import _ from 'lodash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLATIONS_DIR = `${__dirname}/../contents/ui-translations`;

async function getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(dirent => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return Array.prototype
    .concat(...files)
    .filter(file => !file.match(/(\.spec|stories|\.cy)/) && file.match(/(\.js|\.ts|\.tsx|\.jsx)$/));
}

const getKeysFromRepository = async (locale = 'en') =>
  new Promise((resolve, reject) => {
    fs.readFile(`${TRANSLATIONS_DIR}/${locale}.csv`, (err, fileContent) => {
      if (err) reject(err);

      csvtojson({
        delimiter: [',', ';'],
        quote: '"',
        headers: ['key', 'value'],
      })
        .fromString(fileContent.toString())
        .then(resolve)
        .catch(reject);
    });
  });

const findUnusedTranslations = async (files, _translations) => {
  const comparableString = text => text.replaceAll(/['\s;]|&(#39|#x27|quot|rsquo|apos);/g, '');
  const translations = [..._translations];

  for (const file of files) {
    if (!file.includes('/migrations/')) {
      const fileContents = await fs.promises.readFile(file, 'utf8');
      const comparableContent = comparableString(fileContents);

      translations
        .filter(translation => !translation.used)
        .forEach(translation => {
          if (
            comparableContent.includes(comparableString(translation.value)) ||
            comparableContent.includes(comparableString(translation.key))
          ) {
            // eslint-disable-next-line no-param-reassign
            translation.used = true;
          }
        });
    }
  }

  return translations.filter(translation => !translation.used);
};

const processTextNode = (_path, file) => {
  const text = _path.node.value.trim();
  const parentTag = _path.parent.openingElement;
  const container = parentTag?.name.name;

  if (!/\b[a-zA-Z]+\b/g.test(text)) {
    return null;
  }

  let key;
  if (container === 'Translate' && container && parentTag.attributes.length) {
    key = parentTag.attributes.find(a => a.name.name === 'translationKey')?.value.value;
  }
  return { text, container, file: file.split('app/react/').pop(), key: key || text };
};

const processTFunction = (_path, file) => {
  const shortName = file.split('app/react/').pop();
  const key = _path.node.arguments[1].value;
  const text = _path.node.arguments[2]?.value ? _path.node.arguments[2].value : key;

  if (!text) {
    return null;
  }

  return { text: text || key, container: 't', file: shortName, key };
};

const getTextsFromFile = async file => {
  const result = [];
  const parserOptions = {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  };

  if (file.includes('app/react')) {
    const fileContents = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(fileContents, parserOptions);
    traverse.default(ast, {
      enter(_path) {
        if (
          _path.isCallExpression() &&
          _path.node.callee.name === 't' &&
          _path.node.arguments[0].value === 'System'
        ) {
          result.push(processTFunction(_path, file));
        }
        if (_path.isJSXElement()) {
          const noTranslate = _path.node.openingElement.attributes.find(
            a => a.name?.name === 'no-translate'
          );
          if (noTranslate) {
            _path.skip();
          }
        }
        if (_path.isJSXText()) {
          result.push(processTextNode(_path, file));
        }
      },
    });
  }

  return result.filter(t => t);
};

const findMissingTranslations = async (files, translations) => {
  const allTexts = [];

  for (const file of files) {
    const texts = await getTextsFromFile(file);
    allTexts.push(...texts);
  }

  allTexts.filter(t => t);

  return allTexts.filter(
    text =>
      !translations.find(
        translation =>
          translation.key.trim().replace(/\n\s*/g, ' ') === text.key.trim().replace(/\n\s*/g, ' ')
      )
  );
};

const logger = new console.Console(process.stdout, process.stderr);
const reportTexts = (texts, message) => {
  if (texts.length) {
    logger.log(`=== Found \x1b[31m ${texts.length} \x1b[0m ${message} ===`);

    const textsToLog = texts.map(t => ({
      file: t.file,
      text: t.text.length > 50 ? `${t.text.slice(0, 50)}...` : t.text,
    }));
    logger.table(textsToLog, ['file', 'text']);
    logger.log('\n');
  }
};

const reportnotInTranslations = textsNotInTranslations => {
  reportTexts(textsNotInTranslations, 'texts not in translations collection');
};

const reportNoTranslateElement = textsWithoutTranslateElement => {
  reportTexts(textsWithoutTranslateElement, 'texts not wrapped in a <Translate> element');
};

const reportObsoleteTranslations = unused => {
  if (unused.length) {
    const unusedToLog = unused.map(t => ({
      key: t.key.length > 50 ? `${t.key.slice(0, 50)}...` : t.key,
    }));
    logger.log(`=== Found \x1b[31m ${unused.length} \x1b[0m obsolete translations ===`);
    logger.table(unusedToLog, ['key']);
    logger.log('\n');
  }
};

const languageNames = new Intl.DisplayNames(['en'], {
  type: 'language',
});

async function updateLanguageTranslations(locale, obsoleteTranslations, missingTranslations) {
  const languageName = languageNames.of(locale);
  const repositoryTranslations = await getKeysFromRepository(locale);

  return new Promise(resolve => {
    const fileName = path.resolve(TRANSLATIONS_DIR, `${locale}.csv`);
    const csvFile = fs.createWriteStream(fileName);

    const csvStream = csv.format({ headers: true });
    csvStream.pipe(csvFile).on('finish', resolve);
    csvStream.write(['Key', languageName]);

    const cleanedTranslations = repositoryTranslations.filter(
      t => !obsoleteTranslations.find(obsolete => obsolete.key === t.key)
    );

    const addedTranslations = cleanedTranslations.concat(missingTranslations);
    const orderedTranslations = _.orderBy(addedTranslations, entry => entry.key.toLowerCase());
    orderedTranslations.forEach(row => {
      csvStream.write([row.key, row.value || row.key]);
    });

    csvStream.end();
  });
}

const getAvailableLanguages = async () =>
  new Promise((resolve, reject) => {
    fs.readdir(TRANSLATIONS_DIR, (err, files) => {
      if (err) reject(err);
      resolve(files.map(file => file.replace('.csv', '')));
    });
  });

const getTextWithoutTranslateElement = allTexts =>
  allTexts.filter(t => t.container !== 'Translate' && t.container !== 't');

const updateContents = async (unusedTranslations, textsNotInTranslations) => {
  const availableLanguages = await getAvailableLanguages();
  for (const language of availableLanguages) {
    await updateLanguageTranslations(language, unusedTranslations, textsNotInTranslations);
  }
};

async function checkTranslations(dir) {
  const files = await getFiles(dir);
  const translations = await getKeysFromRepository();

  const unusedTranslationsKeys = await findUnusedTranslations(files, translations);
  const textsNotInTranslations = await findMissingTranslations(files, translations);
  const textsWithoutTranslateElement = getTextWithoutTranslateElement(textsNotInTranslations);

  reportnotInTranslations(textsNotInTranslations);
  reportNoTranslateElement(textsWithoutTranslateElement);
  reportObsoleteTranslations(unusedTranslationsKeys);

  await updateContents(unusedTranslationsKeys, textsNotInTranslations);
}

checkTranslations('./app');
