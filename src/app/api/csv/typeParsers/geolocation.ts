import { RawEntity } from 'api/csv/entityRow';
import { MetadataObjectSchema, PropertySchema } from 'shared/types/commonTypes';
import { ensure } from 'shared/tsUtils';
import { csvConstants } from '../csvDefinitions';

const geolocation = async (
  entityToImport: RawEntity,
  property: PropertySchema
): Promise<MetadataObjectSchema[]> => {
  const [lat, lon] = entityToImport.propertiesFromColumns[ensure<string>(property.name)].split(
    csvConstants.multiValueSeparator
  );
  if (lat && lon) {
    return [{ value: { lat: Number(lat), lon: Number(lon), label: '' } }];
  }

  return [];
};

export default geolocation;
