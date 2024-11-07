/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-lines */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Params,
  useLoaderData,
  LoaderFunction,
  useBlocker,
  Link,
  ActionFunction,
  useFetcher,
} from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import { IncomingHttpHeaders } from 'http';
import { useForm } from 'react-hook-form';
import { useSetAtom } from 'jotai';
import { Translate } from 'app/I18N';
import { advancedSort } from 'app/utils/advancedSort';
import { ClientTranslationSchema } from 'app/istore';
import { ConfirmNavigationModal, InputField } from 'app/V2/Components/Forms';
import { SettingsContent } from 'app/V2/Components/Layouts/SettingsContent';
import RenderIfVisible from 'react-render-if-visible';
import { Button, ToggleButton } from 'V2/Components/UI';
import * as translationsAPI from 'V2/api/translations';
import * as settingsAPI from 'V2/api/settings';
import { notificationAtom } from 'V2/atoms';
import { availableLanguages } from 'shared/languagesList';
import { Settings } from 'shared/types/settingsType';
import { FetchResponseError } from 'shared/JSONRequest';
import { LanguagePill } from './components/LanguagePill';

const editTranslationsLoader =
  (headers?: IncomingHttpHeaders): LoaderFunction =>
  async ({ params }: { params: Params }) => {
    const translations = await translationsAPI.get(headers, params);
    const settings = await settingsAPI.get(headers);

    const sortedTranslations = translations.map(language => {
      const sortedContexts = language.contexts.map(context => {
        const sortedContextKeys = advancedSort(Object.keys(context.values)) as string[];

        const sortedContext = sortedContextKeys.reduce((results, contextKey) => {
          const value = context.values[contextKey];
          return { ...results, [contextKey]: value };
        }, {});

        return { ...context, values: sortedContext };
      });

      return { ...language, contexts: sortedContexts };
    });

    return { translations: sortedTranslations, settings };
  };

const editTranslationsAction =
  (): ActionFunction =>
  async ({ params, request }) => {
    const formData = await request.formData();
    const formIntent = formData.get('intent') as 'form-submit' | 'file-upload';
    const { context } = params;

    if (formIntent === 'form-submit' && context) {
      const formValues = formData.get('data') as string;
      return translationsAPI.post(JSON.parse(formValues), context);
    }

    if (formIntent === 'file-upload') {
      const file = formData.get('data') as File;
      return translationsAPI.importTranslations(file, 'System');
    }

    return null;
  };

type formValuesType = {
  _id?: string;
  locale?: string;
  values: { [index: number]: { [key: string]: string } };
}[];

const prepareValuesToSave = (
  data: formValuesType,
  currentTranslations: ClientTranslationSchema[]
): ClientTranslationSchema[] =>
  data.map((language, index) => {
    const values = Object.values(language.values).reduce(
      (result, value) => ({
        ...result,
        [value.key]: value.value,
      }),
      {}
    );
    return {
      ...currentTranslations[index],
      contexts: [{ ...currentTranslations[index].contexts[0], values }],
    };
  });

const composeTableValues = (formValues: formValuesType, termIndex: number) =>
  formValues.map((language, languageIndex) => {
    const languageLabel = availableLanguages.find(
      availableLanguage => availableLanguage.key === language.locale
    )?.localized_label;
    return {
      language: languageLabel,
      translationStatus: {
        languageKey: language.locale,
        status: formValues[languageIndex].values[termIndex]?.translationStatus || 'untranslated',
      },
      fieldKey: `formValues.${languageIndex}.values.${termIndex}.value`,
    };
  });

const getTranslationStatus = (
  defaultLanguageValues: { [key: string]: string },
  evaluatedTerm: { key: string; value: string },
  currentLanguageKey: string,
  defaultLanguageKey: string
) => {
  const isUntranslated =
    defaultLanguageValues[evaluatedTerm.key] === evaluatedTerm.value &&
    defaultLanguageKey !== currentLanguageKey;
  const isDefaultLanguage = defaultLanguageKey === currentLanguageKey;

  if (isUntranslated) return 'untranslated';
  if (isDefaultLanguage) return 'defaultLanguage';
  return 'translated';
};

const prepareFormValues = (translations: ClientTranslationSchema[], defaultLanguageKey: string) => {
  const defaultLanguageValues = translations.find(
    language => language.locale === defaultLanguageKey
  )?.contexts[0].values;

  return translations.map(language => {
    const values = Object.entries(language.contexts[0].values || {}).reduce(
      (result, [key, value], index) => ({
        ...result,
        [index]: {
          key,
          value,
          translationStatus: getTranslationStatus(
            defaultLanguageValues || {},
            { key, value },
            language.locale,
            defaultLanguageKey
          ),
        },
      }),
      {}
    );
    return { _id: language._id?.toString(), locale: language.locale, values };
  });
};

const getContextInfo = (translations: ClientTranslationSchema[]) => {
  const contextTerms = Object.keys(translations[0].contexts[0].values || {});
  const { label: contextLabel, id: contextId } = translations[0].contexts[0];
  return { contextTerms, contextLabel, contextId };
};

const filterTableValues = (values: any[]) =>
  values.filter(value => value.translationStatus.status !== 'translated');

const calculateTableData = (terms: string[], formValues: formValuesType, hideTranslated: boolean) =>
  terms
    .map((term, index) => {
      let values = composeTableValues(formValues, index);
      if (hideTranslated) values = filterTableValues(values);
      if (values.length === 1 && hideTranslated) return undefined;
      return { [term]: values };
    })
    .filter(v => v);

// eslint-disable-next-line max-statements
const EditTranslations = () => {
  const { translations, settings } = useLoaderData() as {
    translations: ClientTranslationSchema[];
    settings: Settings;
  };

  const [hideTranslated, setHideTranslated] = useState(false);
  const fetcher = useFetcher();
  const setNotifications = useSetAtom(notificationAtom);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef: React.MutableRefObject<HTMLInputElement | null> = useRef(null);

  const isSubmitting = fetcher.state === 'submitting';
  const { contextTerms, contextLabel, contextId } = getContextInfo(translations);
  const defaultLanguage = settings?.languages?.find(language => language.default);
  const defaultFormValues = prepareFormValues(translations, defaultLanguage?.key || 'en');
  const tablesData = useMemo(
    () => calculateTableData(contextTerms, defaultFormValues, hideTranslated),
    [contextTerms, defaultFormValues, hideTranslated]
  );

  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    reset,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    formState: { dirtyFields, isSubmitting: formIsSubmitting, isSubmitSuccessful },
  } = useForm({
    defaultValues: { formValues: defaultFormValues },
    mode: 'onSubmit',
  });

  const isDirtyAlt = !!Object.keys(dirtyFields).length;
  const blocker = useBlocker(isDirtyAlt && !formIsSubmitting);

  React.useEffect(() => {
    if (isSubmitSuccessful) {
      reset({}, { keepValues: true });
    }
  }, [isSubmitSuccessful, reset]);

  useMemo(() => {
    if (blocker.state === 'blocked') {
      setShowModal(true);
    }
  }, [blocker, setShowModal]);

  useEffect(() => {
    switch (true) {
      case fetcher.formData?.get('intent') === 'form-submit' && Array.isArray(fetcher.data):
        setNotifications({
          type: 'success',
          text: <Translate>Translations saved</Translate>,
        });
        break;

      case fetcher.formData?.get('intent') === 'file-upload' && Array.isArray(fetcher.data):
        setNotifications({
          type: 'success',
          text: <Translate>Translations imported.</Translate>,
        });
        break;

      case fetcher.data instanceof FetchResponseError:
        setNotifications({
          type: 'error',
          text: <Translate>An error occurred</Translate>,
          details: fetcher.data.json?.prettyMessage ? fetcher.data.json?.prettyMessage : undefined,
        });
        break;

      default:
        break;
    }
  }, [fetcher.data, fetcher.formData, setNotifications]);

  const formSubmit = async (data: { formValues: formValuesType }) => {
    const formData = new FormData();
    const values = prepareValuesToSave(data.formValues, translations);
    formData.set('intent', 'form-submit');
    formData.set('data', JSON.stringify(values));
    fetcher.submit(formData, { method: 'post' });
    reset({}, { keepValues: true });
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const formData = new FormData();
      formData.set('intent', 'file-upload');
      formData.set('data', file);
      fetcher.submit(formData, { method: 'post', encType: 'multipart/form-data' });
      reset({}, { keepValues: true });
    }
  };

  return (
    <div
      className="tw-content"
      style={{ width: '100%', overflowY: 'auto' }}
      data-testid="settings-translations-edit"
    >
      <SettingsContent>
        <SettingsContent.Header
          path={new Map([['Translations', '/settings/translations']])}
          title={contextLabel}
          contextId={contextId}
        />
        <SettingsContent.Body>
          <div className="flex items-center w-full gap-4 pt-5 mb-4">
            <div>
              <ToggleButton
                className="px-5 pt-5"
                onToggle={() => setHideTranslated(!hideTranslated)}
              >
                <div className="pl-1 text-sm text-gray-700">
                  <Translate>Untranslated Terms</Translate>
                </div>
              </ToggleButton>
            </div>
          </div>
          <div className="flex-grow">
            <form onSubmit={handleSubmit(formSubmit)} id="edit-translations">
              {tablesData?.length ? (
                tablesData?.map(tableData => {
                  if (!tableData) return null;
                  const [title] = Object.keys(tableData);
                  const values = tableData[title];
                  return (
                    <RenderIfVisible key={title}>
                      <div className="relative w-full mb-4 border rounded-md shadow-sm border-gray-50">
                        <table className="w-full text-sm text-left" data-testid="table">
                          {title && (
                            <caption className="p-4 text-base font-semibold text-left text-gray-900 bg-white">
                              {title}
                            </caption>
                          )}
                          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr className="border-b">
                              <th scope="col" className="px-6 py-3">
                                <div className="inline-flex">
                                  <Translate>Language</Translate>
                                </div>
                              </th>
                              <th scope="col" className="px-6 py-3">
                                <div className="inline-flex">
                                  <Translate className="sr-only">Language Code</Translate>
                                </div>
                              </th>
                              <th scope="col" className="w-full px-6 py-3">
                                <div className="inline-flex">
                                  <Translate>Value</Translate>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {values.map(value => {
                              const hasErrors = Boolean(
                                getFieldState(value.fieldKey as any)?.error
                              );
                              return (
                                <tr>
                                  <td className="px-6 py-2">{value.language}</td>
                                  <td className="px-6 py-2">
                                    <LanguagePill
                                      languageKey={value.translationStatus.languageKey}
                                      status={value.translationStatus.status}
                                    />
                                  </td>
                                  <td className="px-6 py-2">
                                    <InputField
                                      id={value.fieldKey}
                                      hideLabel
                                      disabled={isSubmitting}
                                      clearFieldAction={() =>
                                        setValue(value.fieldKey as any, '', { shouldDirty: true })
                                      }
                                      hasErrors={hasErrors}
                                      errorMessage={
                                        hasErrors ? (
                                          <Translate>This field is required</Translate>
                                        ) : (
                                          ''
                                        )
                                      }
                                      {...register(value.fieldKey as any, { required: true })}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </RenderIfVisible>
                  );
                })
              ) : (
                <div className="flex items-center gap-2 p-4 border rounded-md border-gray-50 bg-primary-50">
                  <InformationCircleIcon className="w-10 text-primary-800" />
                  <span className="text-primary-800">
                    <Translate>There are no untranslated terms</Translate>
                  </span>
                </div>
              )}
            </form>
          </div>
        </SettingsContent.Body>
        <SettingsContent.Footer>
          <div className="flex justify-end gap-2">
            <div className="flex-1">
              {contextId === 'System' && (
                <>
                  <Button
                    styling="light"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Translate>Import</Translate>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="text/csv"
                    className="hidden"
                    onChange={importFile}
                  />
                </>
              )}
            </div>
            <Link to="/settings/translations">
              <Button styling="light" type="button" disabled={isSubmitting}>
                <Translate>Cancel</Translate>
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} form="edit-translations">
              <Translate>Save</Translate>
            </Button>
          </div>
        </SettingsContent.Footer>
      </SettingsContent>

      {showModal && (
        <ConfirmNavigationModal setShowModal={setShowModal} onConfirm={blocker.proceed} />
      )}
    </div>
  );
};

export { EditTranslations, editTranslationsLoader, editTranslationsAction };
