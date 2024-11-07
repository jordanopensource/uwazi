import React, { Component } from 'react';

import { TemplateSchema } from 'shared/types/templateType';
import { IImmutable } from 'shared/types/Immutable';
import comonProperties from 'shared/commonProperties';
import { Icon } from 'UI';
import { ClientEntitySchema } from 'app/istore';
import { Translate } from 'app/I18N';
import { actions, ShowMetadata, wrapEntityMetadata } from 'app/Metadata';
import { store } from 'app/store';

import { SearchEntities } from './SearchEntities';

type CopyFromEntityProps = {
  isVisible: boolean;
  onSelect: Function;
  onCancel: Function;
  templates: IImmutable<Array<TemplateSchema>>;
  originalEntity: ClientEntitySchema;
  formModel: string;
};

type CopyFromEntityState = {
  selectedEntity: ClientEntitySchema;
  propsToCopy: Array<string>;
  lastSearch?: string;
};

class CopyFromEntity extends Component<CopyFromEntityProps, CopyFromEntityState> {
  templates: TemplateSchema[];

  constructor(props: CopyFromEntityProps) {
    super(props);

    this.state = { propsToCopy: [], selectedEntity: {}, lastSearch: undefined };
    this.templates = this.props.templates.toJS();
    this.onSelect = this.onSelect.bind(this);
    this.cancel = this.cancel.bind(this);
    this.copy = this.copy.bind(this);
    this.backToSearch = this.backToSearch.bind(this);
    this.onFinishedSearch = this.onFinishedSearch.bind(this);
  }

  onSelect(selectedEntity: ClientEntitySchema) {
    const copyFromTemplateId = selectedEntity.template;
    const originalTemplate = this.props.originalEntity.template;

    const propsToCopy = comonProperties
      .comonProperties(
        this.templates,
        [originalTemplate, copyFromTemplateId],
        ['generatedid', 'media', 'image']
      )
      .map(p => p.name);

    this.setState({ selectedEntity, propsToCopy });
    this.props.onSelect(propsToCopy, selectedEntity);
  }

  onFinishedSearch(searchTerm: string) {
    this.setState({ lastSearch: searchTerm });
  }

  copy() {
    if (!this.state.selectedEntity.metadata) {
      return;
    }

    const entityTemplate = this.templates.find(
      template => template._id === this.props.originalEntity.template
    );

    const originalEntity: ClientEntitySchema = wrapEntityMetadata(
      this.props.originalEntity,
      entityTemplate
    );

    const updatedEntity = this.state.propsToCopy.reduce(
      (entity: ClientEntitySchema, propName: string) => {
        if (!entity.metadata) {
          return { ...entity, metadata: {} };
        }

        const updatedMetadata = this.state.selectedEntity.metadata![propName];

        return {
          ...entity,
          metadata: { ...entity.metadata, [propName]: updatedMetadata },
        };
      },
      { ...originalEntity }
    );

    actions
      .loadFetchedInReduxForm(this.props.formModel, updatedEntity, this.templates)
      .forEach(action => store?.dispatch(action));

    this.props.onSelect([]);
    this.props.onCancel();
  }

  backToSearch() {
    this.setState({ propsToCopy: [], selectedEntity: {} });
    this.props.onSelect([]);
  }

  cancel() {
    this.props.onSelect([]);
    this.props.onCancel();
    this.setState({ propsToCopy: [], selectedEntity: {} });
  }

  renderPanel() {
    return this.state.selectedEntity._id ? (
      <>
        <div className="view">
          <ShowMetadata
            entity={this.state.selectedEntity}
            showTitle
            showType
            highlight={this.state.propsToCopy}
            excludePreview
          />
        </div>
        <div className="copy-from-buttons btn-cluster">
          <button
            className="back-copy-from btn btn-light"
            type="button"
            onClick={this.backToSearch}
          >
            <Icon icon="arrow-left" />
            <span className="hidden btn-label">
              <Translate>Back to search</Translate>
            </span>
          </button>
          <button className="cancel-copy-from btn btn-light" type="button" onClick={this.cancel}>
            <Icon icon="times" />
            <span className="btn-label">
              <Translate>Cancel</Translate>
            </span>
          </button>
          <button className="copy-copy-from btn btn-success" type="button" onClick={this.copy}>
            <Icon icon="copy-from" transform="left-0.075 up-0.1" />
            <span className="btn-label">
              <Translate>Copy Highlighted</Translate>
            </span>
          </button>
        </div>
      </>
    ) : (
      <>
        <SearchEntities
          onSelect={this.onSelect}
          onFinishSearch={this.onFinishedSearch}
          initialSearchTerm={this.state.lastSearch}
        />
        <div className="copy-from-buttons btn-cluster">
          <button className="cancel-copy-from btn btn-light" type="button" onClick={this.cancel}>
            <Icon icon="times" />
            <span className="btn-label">
              <Translate>Cancel</Translate>
            </span>
          </button>
        </div>
      </>
    );
  }

  render() {
    return <div className="copy-from">{this.props.isVisible && this.renderPanel()}</div>;
  }
}

export type { CopyFromEntityProps, CopyFromEntityState };
export { CopyFromEntity };
