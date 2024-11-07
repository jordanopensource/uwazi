// eslint-disable-next-line node/no-restricted-import
import fs from 'fs';

import { ValidateFormatError, ValidateFormatOptions, peekHeaders, validateFormat } from '../csv';
import { mockCsvFileReadStream } from './helpers';

const mockFileStream = (content: string) => {
  const mockedFile = mockCsvFileReadStream(content);
  const mockedFileStream = fs.createReadStream('mocked_file');
  return { mockedFile, mockedFileStream };
};

describe('peekHeaders()', () => {
  it('should return the headers of a CSV file', async () => {
    const content = `title, textprop, textprop__es, textprop__en
    title1, text1, text1_es, text1_en`;
    const { mockedFile, mockedFileStream } = mockFileStream(content);
    const headers = await peekHeaders(mockedFileStream);
    expect(headers).toEqual(['title', ' textprop', ' textprop__es', ' textprop__en']);
    mockedFile.mockRestore();
  });

  it('should handle path as input', async () => {
    const path = 'app/api/csv/specs/arrangeThesauriTest.csv';
    const headers = await peekHeaders(path);
    expect(headers).toEqual([
      'title',
      'unrelated_property',
      'select_property__en',
      ' Select Property__es',
      'Multiselect Property__en',
      ' multiselect_property__es',
      ' no_new_value_select',
    ]);
  });
});

describe('validateFormat()', () => {
  const expectValidateFormatError = async (
    content: string,
    options: ValidateFormatOptions,
    message: string
  ) => {
    const { mockedFile } = mockFileStream(content);
    await expect(async () => validateFormat('mocked/file/path', options))
      .rejects.toThrow(new ValidateFormatError(message))
      .finally(async () => mockedFile.mockRestore());
  };

  const testValidationPass = async (content: string, options: ValidateFormatOptions) => {
    const { mockedFile } = mockFileStream(content);
    await validateFormat('mocked/file/path', options);
    mockedFile.mockRestore();
  };

  it.each([
    {
      content: 'title,textprop\ntitle1, text1',
      columns: 3,
      message: 'Expected 3 columns, but found 2.',
    },
    {
      content: 'title,textprop\ntitle1',
      columns: 1,
      message: 'Expected 1 columns, but found 2.',
    },
  ])('should be able to check the number of columns', async ({ content, columns, message }) => {
    await expectValidateFormatError(content, { column_number: columns }, message);

    await testValidationPass(content, { column_number: 2 });
  });

  it('should be able to check the required column names', async () => {
    const content = 'title,textprop,extra_is_okay\nvalue1,value2,value3';

    await expectValidateFormatError(
      content,
      { required_headers: ['title', 'missing', 'also_missing'] },
      'Missing required headers: missing, also_missing.'
    );

    await testValidationPass(content, { required_headers: ['title', 'textprop'] });
  });

  it('should be able to check for no empty values', async () => {
    const missingInFirstLine = 'title,textprop\nvalue1,';
    await expectValidateFormatError(
      missingInFirstLine,
      { no_empty_values: true },
      'Empty value at row 1, column "textprop".'
    );

    const missingInSecondLine = 'title,textprop,number\nvalue1,value2,0\nvalue3,,0';
    await expectValidateFormatError(
      missingInSecondLine,
      { no_empty_values: true },
      'Empty value at row 2, column "textprop".'
    );
    await testValidationPass(missingInSecondLine, { no_empty_values: false });

    const full = 'title,textprop\nvalue1,value2';
    await testValidationPass(full, { no_empty_values: true });
  });
});
