/* eslint-disable no-redeclare */
import { MongoIdHandler } from 'api/common.v2/database/MongoIdGenerator';
import { propertyTypes } from 'shared/propertyTypes';
import { PropertySchema } from 'shared/types/commonTypes';
import { Property } from '../model/Property';
import { RelationshipProperty } from '../model/RelationshipProperty';
import { Template } from '../model/Template';
import { V1RelationshipProperty } from '../model/V1RelationshipProperty';
import { mapPropertyQuery } from './QueryMapper';
import { TraverseQueryDBO } from './schemas/RelationshipsQueryDBO';
import { RelationshipPropertyDBO, TemplateDBO } from './schemas/TemplateDBO';
import { CommonProperty } from '../model/CommonProperty';

type PropertyDBO = TemplateDBO['properties'][number];

function propertyToApp(
  property: RelationshipPropertyDBO,
  _templateId: TemplateDBO['_id']
): RelationshipProperty;
function propertyToApp(property: PropertySchema, _templateId: TemplateDBO['_id']): Property;
function propertyToApp(property: PropertyDBO, _templateId: TemplateDBO['_id']): Property {
  const templateId = MongoIdHandler.mapToApp(_templateId);
  const propertyId = property._id?.toString() || MongoIdHandler.generate();
  if ('isCommonProperty' in property && property.isCommonProperty) {
    return new CommonProperty(propertyId, property.type, property.name, property.label, templateId);
  }
  switch (property.type) {
    case propertyTypes.newRelationship:
      return new RelationshipProperty(
        propertyId,
        property.name,
        property.label,
        mapPropertyQuery(property.query as TraverseQueryDBO[]),
        templateId,
        property.denormalizedProperty
      );
    case propertyTypes.relationship:
      if (!property.relationType) throw new Error('Relation type is required');
      return new V1RelationshipProperty(
        propertyId,
        property.name,
        property.label,
        property.relationType,
        templateId,
        property.content
      );
    default:
      return new Property(propertyId, property.type, property.name, property.label, templateId);
  }
}

const TemplateMappers = {
  propertyToApp,
  toApp: (tdbo: TemplateDBO): Template =>
    new Template(
      MongoIdHandler.mapToApp(tdbo._id),
      tdbo.name,
      tdbo.properties.map(p => propertyToApp(p, tdbo._id)),
      tdbo.commonProperties.map(p => propertyToApp(p, tdbo._id))
    ),
};

export { TemplateMappers };
