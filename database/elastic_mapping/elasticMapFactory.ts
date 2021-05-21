import { TemplateSchema } from 'shared/types/templateType';
import { propertyMappings, relationshipInherit } from './mappings';

export default {
  mapping: (templates: TemplateSchema[], topicClassification: boolean) => {
    const baseMappingObject = {
      properties: {
        metadata: {
          properties: {},
        },
        suggestedMetadata: {
          properties: {},
        },
      },
    };

    // const inheritedProps = await getInheritedProps(templates);

    return templates.reduce(
      (baseMapping: any, template: TemplateSchema) =>
        // eslint-disable-next-line max-statements
        template.properties?.reduce((_map: any, property) => {
          const map = { ..._map };
          if (!property.name || !property.type || property.type === 'preview') {
            return map;
          }

          map.properties.metadata.properties[property.name] = {
            properties: propertyMappings[property.type](),
          };
          if (
            topicClassification &&
            (property.type === 'select' || property.type === 'multiselect')
          ) {
            map.properties.suggestedMetadata.properties[property.name] = {
              properties: propertyMappings[property.type](),
            };
          }

          const fieldMapping = propertyMappings[property.type]();

          map.properties.metadata.properties[property.name] = { properties: fieldMapping };
          map.properties.suggestedMetadata.properties[property.name] = { properties: fieldMapping };

          if (property.inherit?.type && property.inherit.type !== 'preview') {
            map.properties.metadata.properties[property.name] = {
              properties: relationshipInherit(property.inherit.type),
            };
            map.properties.suggestedMetadata.properties[property.name] = {
              properties: relationshipInherit(property.inherit.type),
            };
          }

          return map;
        }, baseMapping),
      baseMappingObject
    );
  },
};
