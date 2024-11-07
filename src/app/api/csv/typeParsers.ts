import url from 'url';

import { RawEntity } from 'api/csv/entityRow';
import { MetadataObjectSchema, PropertySchema } from 'shared/types/commonTypes';
import { ensure } from 'shared/tsUtils';

import moment from 'moment';
import generatedid from './typeParsers/generatedid';
import geolocation from './typeParsers/geolocation';
import multiselect from './typeParsers/multiselect';
import select from './typeParsers/select';
import relationship from './typeParsers/relationship';
import { csvConstants } from './csvDefinitions';

const defaultParser = async (
  entityToImport: RawEntity,
  property: PropertySchema
): Promise<MetadataObjectSchema[]> => [
  { value: entityToImport.propertiesFromColumns[ensure<string>(property.name)] },
];

const parseDateValue = (dateValue: string, dateFormat: string) => {
  const allowedFormats = [
    dateFormat.toUpperCase(),
    'LL',
    'YYYY MM DD',
    'YYYY/MM/DD',
    'YYYY-MM-DD',
    'YYYY',
  ];

  return moment.utc(dateValue, allowedFormats).unix();
};

const parseDate = (dateValue: string, dateFormat: string) => ({
  value: parseDateValue(dateValue, dateFormat),
});

const parseDateRange = (rangeValue: string, dateFormat: string) => {
  const [from, to] = rangeValue.split(csvConstants.dateRangeImportSeparator);

  return {
    value: {
      from: from !== '' ? parseDateValue(from, dateFormat) : null,
      to: to !== '' ? parseDateValue(to, dateFormat) : null,
    },
  };
};

const parseMultiValue = (values: string) =>
  values.split(csvConstants.multiValueSeparator).filter(value => value !== '');

export default {
  nested: defaultParser,
  preview: defaultParser,
  image: defaultParser,
  media: defaultParser,
  markdown: defaultParser,
  text: defaultParser,
  generatedid,
  geolocation,
  select,
  multiselect,
  relationship,
  newRelationship: defaultParser,

  async numeric(
    entityToImport: RawEntity,
    property: PropertySchema
  ): Promise<MetadataObjectSchema[]> {
    const value = entityToImport.propertiesFromColumns[ensure<string>(property.name)];
    return Number.isNaN(Number(value)) ? [{ value }] : [{ value: Number(value) }];
  },

  async date(
    entityToImport: RawEntity,
    property: PropertySchema,
    dateFormat: string
  ): Promise<MetadataObjectSchema[]> {
    const date = entityToImport.propertiesFromColumns[ensure<string>(property.name)];
    return [parseDate(date, dateFormat)];
  },

  async multidate(
    entityToImport: RawEntity,
    property: PropertySchema,
    dateFormat: string
  ): Promise<MetadataObjectSchema[]> {
    const dates = parseMultiValue(
      entityToImport.propertiesFromColumns[ensure<string>(property.name)]
    );
    return dates.map(date => parseDate(date, dateFormat));
  },

  async daterange(
    entityToImport: RawEntity,
    property: PropertySchema,
    dateFormat: string
  ): Promise<MetadataObjectSchema[]> {
    const range = entityToImport.propertiesFromColumns[ensure<string>(property.name)];
    return [parseDateRange(range, dateFormat)];
  },

  async multidaterange(
    entityToImport: RawEntity,
    property: PropertySchema,
    dateFormat: string
  ): Promise<MetadataObjectSchema[]> {
    const ranges = parseMultiValue(
      entityToImport.propertiesFromColumns[ensure<string>(property.name)]
    );
    return ranges.map(range => parseDateRange(range, dateFormat));
  },

  async link(
    entityToImport: RawEntity,
    property: PropertySchema
  ): Promise<MetadataObjectSchema[] | null> {
    let [label, linkUrl] = entityToImport.propertiesFromColumns[
      ensure<string>(property.name)
    ].split(csvConstants.multiValueSeparator);

    if (!linkUrl) {
      linkUrl = entityToImport.propertiesFromColumns[ensure<string>(property.name)];
      label = linkUrl;
    }

    if (!url.parse(linkUrl).host) {
      return null;
    }

    return [
      {
        value: {
          label,
          url: linkUrl,
        },
      },
    ];
  },
};
