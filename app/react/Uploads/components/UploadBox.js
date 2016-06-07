import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import Dropzone from 'react-dropzone';

import {uploadDocument, finishEdit, createDocument} from 'app/Uploads/actions/uploadsActions';

export class UploadBox extends Component {
  onDrop(files) {
    files.forEach((file) => {
      let doc = {title: this.extractTitle(file)};
      this.props.createDocument(doc)
      .then((newDoc) => {
        this.props.uploadDocument(newDoc._id, file);
      });
    });
    this.props.finishEdit();
  }

  extractTitle(file) {
    let title = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/ {2}/g, ' ');

    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  render() {
    return (
      <Dropzone style={{}} onDrop={this.onDrop.bind(this)} accept="application/pdf">
        <div className="upload-box">
          <p className="upload-box_title">
            <i className="fa fa-upload"></i>
            <span>Drag and drop your files</span>
          </p>
          <a className="upload-box_link">or click here for browsing your local files</a>
          <p className="upload-box_files">Supported formats: PDF</p>
        </div>
      </Dropzone>
    );
  }
}

UploadBox.propTypes = {
  uploadDocument: PropTypes.func,
  createDocument: PropTypes.func,
  finishEdit: PropTypes.func
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators({uploadDocument, finishEdit, createDocument}, dispatch);
}

export default connect(null, mapDispatchToProps)(UploadBox);
