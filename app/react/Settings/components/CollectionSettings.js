import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {actions} from 'app/BasicReducer';
import SettingsAPI from 'app/Settings/SettingsAPI';
import {notify} from 'app/Notifications/actions/notificationsActions';
import {t} from 'app/I18N';

export class CollectionSettings extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {siteName: props.settings.site_name};
  }

  changeName(e) {
    this.setState({siteName: e.target.value});
    this.props.setSettings(Object.assign(this.props.settings, {site_name: e.target.value}));
  }

  updateSettings(e) {
    e.preventDefault();
    const {_id, _rev, site_name} = this.props.settings;
    SettingsAPI.save({_id, _rev, site_name})
    .then((result) => {
      this.props.notify(t('Settings updated.'), 'success');
      this.props.setSettings(Object.assign(this.props.settings, result));
    });
  }

  render() {
    return (
      <div className="panel panel-default">
        <div className="panel-heading">{t('Collection settings')}</div>
        <div className="panel-body">
          <form onSubmit={this.updateSettings.bind(this)}>
            <div className="form-group">
              <label htmlFor="collection_name">Name</label>
              <input onChange={this.changeName.bind(this)} value={this.state.siteName} type="text" className="form-control"/>
            </div>
            <button type="submit" className="btn btn-success">{t('Update')}</button>
          </form>
        </div>
      </div>
    );
  }
}

CollectionSettings.propTypes = {
  settings: PropTypes.object,
  setSettings: PropTypes.func,
  notify: PropTypes.func
};

export function mapStateToProps(state) {
  return {settings: state.settings.collection.toJS()};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({setSettings: actions.set.bind(null, 'settings/collection'), notify}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CollectionSettings);
