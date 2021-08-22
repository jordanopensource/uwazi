import db from 'api/utils/testing_db';
import { propertyTypes } from 'shared/propertyTypes';

const templateToBeEditedId = db.id();
const templateToBeDeleted = '589af97080fc0b23471d67f1';
const templateWithContents = db.id();
const swapTemplate = db.id();
const relatedTo = db.id();
const templateToBeInherited = db.id();
const propertyToBeInherited = db.id();
const thesauriId1 = db.id();
const thesauriId2 = db.id();
export default {
  templates: [
    {
      _id: templateToBeEditedId,
      name: 'template to be edited',
      properties: [],
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
      default: true,
    },
    {
      _id: db.id(templateToBeDeleted),
      name: 'to be deleted',
      properties: [],
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
    },
    {
      _id: db.id(),
      name: 'duplicated name',
      properties: [],
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
    },
    {
      _id: db.id(),
      name: 'thesauri template',
      properties: [
        {
          type: propertyTypes.select,
          content: thesauriId1.toString(),
          label: 'select',
          name: 'select',
        },
        { type: propertyTypes.relationship, content: templateToBeDeleted, label: 'select2' },
      ],
      commonProperties: [{ name: 'title', label: 'Title' }],
    },
    {
      _id: db.id(),
      name: 'thesauri template 2',
      properties: [
        {
          type: propertyTypes.select,
          content: thesauriId1.toString(),
          label: 'select2',
          name: 'select2',
        },
        { type: propertyTypes.select, content: templateToBeDeleted, label: 'selectToBeDeleted' },
      ],
      commonProperties: [{ name: 'title', label: 'Title' }],
    },
    {
      _id: db.id(),
      name: 'thesauri template 3',
      properties: [
        { type: propertyTypes.text, label: 'text' },
        { type: propertyTypes.text, label: 'text2' },
        {
          type: propertyTypes.select,
          content: templateToBeDeleted,
          label: 'selectToBeDeleted',
          name: 'selecttobedeleted',
        },
      ],
      commonProperties: [{ name: 'title', label: 'Title' }],
    },
    {
      _id: templateWithContents,
      name: 'content template',
      commonProperties: [{ _id: db.id(), name: 'title', label: 'Title', type: 'text' }],
      properties: [
        {
          _id: db.id(),
          id: '1',
          type: propertyTypes.select,
          content: thesauriId1.toString(),
          label: 'select3',
          name: 'select3',
        },
        {
          _id: db.id(),
          id: '2',
          type: propertyTypes.multiselect,
          content: thesauriId1.toString(),
          label: 'select4',
          name: 'select4',
        },
        {
          _id: db.id(),
          id: '95fc3307-7078-41a5-95b5-9c535d629c54',
          type: propertyTypes.generatedid,
          label: 'Generated Id',
          name: 'generated_id',
        },
      ],
    },
    {
      _id: swapTemplate,
      name: 'swap names template',
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
      properties: [
        { id: '1', type: propertyTypes.text, name: 'text', label: 'Text' },
        { id: '2', type: propertyTypes.select, name: 'select5', label: 'Select5' },
      ],
    },
    {
      _id: templateToBeInherited,
      name: 'template to be inherited',
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
      properties: [{ _id: propertyToBeInherited, name: 'inherit_me', type: 'text' }],
      default: true,
    },
    {
      name: 'template inheriting from another',
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
      properties: [
        {
          id: '1',
          type: propertyTypes.relationship,
          name: 'inherit',
          label: 'Inherit',
          relationtype: relatedTo,
          content: templateToBeInherited,
          inherit: {
            property: propertyToBeInherited,
            type: 'text',
          },
        },
      ],
    },
    {
      _id: '5bfbb1a0471dd0fc16ada146',
      name: 'template_with_extracted_metadata',
      commonProperties: [{ name: 'title', label: 'Title', type: 'text' }],
      properties: [
        { _id: '1234', label: 'text', name: 'property_a', type: 'text' },
        { _id: '4567', label: 'markdown', name: 'property_b', type: 'markdown' },
        { _id: '7890', label: 'numeric', name: 'property_c', type: 'numeric' },
        { _id: '1011', label: 'link', name: 'property_d', type: 'link' },
      ],
    },
  ],
  relationtypes: [{ _id: relatedTo, name: 'related to' }],
  settings: [
    {
      _id: db.id(),
      site_name: 'Uwazi',
      languages: [{ key: 'en', label: 'English', default: true }],
    },
  ],
  dictionaries: [
    { _id: thesauriId1, name: 'options' },
    { _id: thesauriId2, name: 'options' },
  ],
  files: [
    {
      filename: 'file1.pdf',
      _id: db.id(),
      extractedMetadata: [
        {
          propertyID: '1234',
          name: 'property_a',
          selection: { text: 'sample text of file 1 for propA' },
        },
        {
          propertyID: '4567',
          name: 'property_b',
          selection: { text: 'sample text of file 1 for propB' },
        },
        {
          propertyID: '7890',
          name: 'property_c',
          selection: { text: 'a number in file 1' },
        },
      ],
    },
    {
      filename: 'file2.pdf',
      _id: db.id(),
      extractedMetadata: [
        {
          propertyID: '1234',
          name: 'property_a',
          selection: { text: 'sample text of file 2 for propA' },
        },
        {
          propertyID: '4567',
          name: 'property_b',
          selection: { text: 'sample text of file 2 for propB' },
        },
        {
          propertyID: '7890',
          name: 'property_c',
          selection: { text: 'a number in file 2' },
        },
      ],
    },
    {
      filename: 'file3.pdf',
      _id: db.id(),
      extractedMetadata: [
        {
          propertyID: '1234',
          name: 'property_a',
          selection: { text: 'sample text of file 3 for propA' },
        },
        {
          propertyID: '4567',
          name: 'property_b',
          selection: { text: 'sample text of file 3 for propB' },
        },
        {
          propertyID: '7890',
          name: 'property_c',
          selection: { text: 'a number in file 3' },
        },
      ],
    },
    {
      filename: 'file4.pdf',
      _id: db.id(),
    },
  ],
};

export {
  templateToBeEditedId,
  templateToBeDeleted,
  templateWithContents,
  swapTemplate,
  templateToBeInherited,
  propertyToBeInherited,
  relatedTo,
  thesauriId1,
  thesauriId2,
};
