/** @format */
import RouteHandler from 'app/App/RouteHandler';
import { actions } from 'app/BasicReducer';
import { t } from 'app/I18N';
import ThesaurisAPI from 'app/Thesauris/ThesaurisAPI';
import React from 'react';
import { connect } from 'react-redux';
import { Icon } from 'UI';

/** Model is the type used for holding information about a classifier model. */
interface ClassifierModel {
  name: string;
  preferred: string;
  bert: string;
  sample: number;
}

function toTwoDecimals(num: number) {
  return (+num).toFixed(2);
}

function qualityIcon(val: number) {
  switch (true) {
    case val > 0.95:
      return (
        <div className="quality-icon quality-high">
          <Icon icon="circle" />
          <Icon icon="circle" />
          <Icon icon="circle" />
        </div>
      );
    case val > 0.9:
      return (
        <div className="quality-icon quality-med">
          <Icon icon="circle" />
          <Icon icon="circle" />
        </div>
      );
    default:
      return (
        <div className="quality-icon quality-low">
          <Icon icon="circle" />
        </div>
      );
  }
}

class ThesaurusCockpit extends RouteHandler {
  static async requestState(requestParams: any) {
    // Thesauri should always have a length of 1, because a specific thesaurus ID is passed in the requestParams.
    const thesauri = await ThesaurisAPI.getThesauri(requestParams);
    const thesaurus = thesauri[0];

    // Fetch models associated with known thesauri.
    const modelParams = requestParams.onlyHeaders().set({ model: thesaurus.name });
    const model: ClassifierModel = await ThesaurisAPI.getModelStatus(modelParams);

    return [actions.set('thesauri/thesaurus', thesaurus), actions.set('thesauri/models', [model])];
  }

  render() {
    const { values: topics } = this.props.thesauri; // {name: Themes; values: [{label: Education}, ...]}
    const { name } = this.props.thesauri; // {name: Themes; values: [{label: Education}, ...]}
    const modelInfo = this.props.models.find((model: ClassifierModel) => model.name === name);

    return (
      <div className="panel panel-default">
        <div className="panel-heading">{t('System', `Thesauri > ${name}`)}</div>
        {modelInfo === undefined ? null : (
          <div className="item item-info">
            <ul>
              <p>Classifier Instance: {modelInfo.preferred}</p>
              <p>BERT: {modelInfo.bert}</p>
              <p>Completeness: {toTwoDecimals(modelInfo.completeness)}</p>
              <p>Extraneous: {toTwoDecimals(modelInfo.extraneous)}</p>
            </ul>
          </div>
        )}
        <div className="cockpit">
          <table>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Quality</th>
                <th scope="col">Documents To Be Reviewed</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {topics === undefined
                ? null
                : topics.map((topic: { label: string }) => (
                    <tr key={topic.label}>
                      <th scope="row">{topic.label}</th>
                      <td>
                        {qualityIcon(modelInfo.topics[topic.label].quality)}
                        {toTwoDecimals(modelInfo.topics[topic.label].quality)}
                      </td>
                      <td>{modelInfo.topics[topic.label].samples}</td>
                      <td>
                        <button className="btn btn-xs" type="button">
                          <Icon icon="search" />
                          &nbsp;
                          <span>{t('System', 'Review Suggestions')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="settings-footer" />
      </div>
    );
  }
}

function mapStateToProps(state: any) {
  return {
    models: state.thesauri.models.toJS(), // {name: ModelName; bert: bert123; sample: 53}
    thesauri: state.thesauri.thesaurus.toJS(), // {name: Themes; values: [{label: Education, id: lkajsdf}, ...]}
  };
}

export default connect(
  mapStateToProps,
  null
  //{ withRef: true }
)(ThesaurusCockpit);
