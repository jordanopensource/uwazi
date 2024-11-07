/* eslint-disable react/no-multi-comp */
/* eslint-disable max-statements */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Translate, t } from 'app/I18N';
import { Button, Card, Sidepanel } from 'V2/Components/UI';
import { Checkbox } from 'app/V2/Components/Forms';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { SuggestionCustomFilter } from 'shared/types/suggestionType';

interface FiltersSidepanelProps {
  showSidepanel: boolean;
  setShowSidepanel: React.Dispatch<React.SetStateAction<boolean>>;
  aggregation: any;
}

const Header = ({ label, total }: { label: string; total: number }) => (
  <div className="flex items-center space-x-2 text-indigo-700">
    <div className="flex-none">{label}</div>
    <div className="flex-1 border-t border-dashed border-t-gray-200" />
    <div className="flex-none">{total}</div>
  </div>
);

const getPercentage = (match: number, total: number): string => {
  const percentage = (match / total) * 100;

  if (Number.isNaN(percentage)) {
    return '-';
  }

  return `${Math.round(percentage)}%`;
};

const FiltersSidepanel = ({
  showSidepanel,
  setShowSidepanel,
  aggregation,
}: FiltersSidepanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultFilter: SuggestionCustomFilter = {
    labeled: {
      match: false,
      mismatch: false,
    },
    nonLabeled: {
      noContext: false,
      withSuggestion: false,
      noSuggestion: false,
      obsolete: false,
      others: false,
    },
  };

  let initialFilters: SuggestionCustomFilter = defaultFilter;

  try {
    if (searchParams.has('filter')) {
      initialFilters = JSON.parse(searchParams.get('filter')!);
    }
  } catch (e) {}

  const { register, handleSubmit, reset, setValue } = useForm({
    values: initialFilters,
    defaultValues: defaultFilter,
  });

  const submitFilters = async (filters: SuggestionCustomFilter) => {
    setSearchParams((prev: URLSearchParams) => {
      prev.set('page', '1');
      prev.set('filter', JSON.stringify(filters));
      return prev;
    });
    setShowSidepanel(false);
  };

  const checkOption = (e: any, optionName: any) => {
    const { checked } = e.target;
    setValue(optionName, checked);
  };

  const clearFilters = () => {
    setSearchParams(prev => {
      prev.delete('filter');
      return prev;
    });
    setShowSidepanel(false);
    reset();
  };

  return (
    <Sidepanel
      isOpen={showSidepanel}
      withOverlay
      closeSidepanelFunction={() => setShowSidepanel(false)}
      title={
        <span className="text-base font-semibold uppercase">
          <Translate>Stats & Filters</Translate>
        </span>
      }
    >
      <form onSubmit={handleSubmit(submitFilters)} className="flex flex-col h-full">
        <Sidepanel.Body className="flex flex-col flex-grow gap-4">
          <Card
            title={<Header label={t('System', 'Labeled')} total={aggregation.labeled._count} />}
          >
            <div className="mx-4 mb-3 space-y-1 text-black">
              <div className="flex items-center space-x-1 bg-green-200">
                <div className="flex-none">
                  <Translate>Accuracy</Translate>
                </div>
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none font-mono">
                  {getPercentage(aggregation.labeled.match, aggregation.labeled._count)}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label="Match"
                  {...register('labeled.match')}
                  onChange={e => {
                    checkOption(e, 'labeled.match');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.labeled.match}</div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label="Mismatch"
                  {...register('labeled.mismatch')}
                  onChange={e => {
                    checkOption(e, 'labeled.mismatch');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.labeled.mismatch}</div>
              </div>
            </div>
          </Card>
          <Card
            title={
              <Header label={t('System', 'Non-labeled')} total={aggregation.nonLabeled._count} />
            }
          >
            <div className="mx-4 mb-3 space-y-1">
              <div className="flex items-center space-x-1 bg-yellow-100">
                <div className="flex-none">
                  <Translate>Pending</Translate>
                </div>
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none font-mono">
                  {getPercentage(aggregation.nonLabeled._count, aggregation.total)}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label={<Translate>With suggestion</Translate>}
                  {...register('nonLabeled.withSuggestion')}
                  onChange={e => {
                    checkOption(e, 'nonLabeled.withSuggestion');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.nonLabeled.withSuggestion}</div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label={<Translate>No suggestion</Translate>}
                  {...register('nonLabeled.noSuggestion')}
                  onChange={e => {
                    checkOption(e, 'nonLabeled.noSuggestion');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.nonLabeled.noSuggestion}</div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label={<Translate>No context</Translate>}
                  {...register('nonLabeled.noContext')}
                  onChange={e => {
                    checkOption(e, 'nonLabeled.noContext');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.nonLabeled.noContext}</div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label={<Translate>Obsolete</Translate>}
                  {...register('nonLabeled.obsolete')}
                  onChange={e => {
                    checkOption(e, 'nonLabeled.obsolete');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.nonLabeled.obsolete}</div>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  label={<Translate>Others</Translate>}
                  {...register('nonLabeled.others')}
                  onChange={e => {
                    checkOption(e, 'nonLabeled.others');
                  }}
                />
                <div className="flex-1 border-t border-dashed border-t-gray-200" />
                <div className="flex-none">{aggregation.nonLabeled.others}</div>
              </div>
            </div>
          </Card>
        </Sidepanel.Body>
        <Sidepanel.Footer className="px-4 py-3">
          <div className="flex gap-2">
            <Button className="flex-grow" type="button" styling="outline" onClick={clearFilters}>
              <Translate>Clear all</Translate>
            </Button>
            <Button className="flex-grow" type="submit">
              <Translate>Apply</Translate>
            </Button>
          </div>
        </Sidepanel.Footer>
      </form>
    </Sidepanel>
  );
};

export { FiltersSidepanel };
