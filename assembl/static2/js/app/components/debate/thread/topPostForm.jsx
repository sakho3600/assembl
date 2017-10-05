// @flow
import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import { Row, Col, FormGroup, Button } from 'react-bootstrap';
import { I18n, Translate } from 'react-redux-i18n';
import type { RawContentState } from 'draft-js';

import createPostMutation from '../../../graphql/mutations/createPost.graphql';
import uploadDocumentMutation from '../../../graphql/mutations/uploadDocument.graphql';
import { convertRawContentStateToHTML, rawContentStateIsEmpty } from '../../../utils/draftjs';
import { displayAlert, promptForLoginOr } from '../../../utils/utilityManager';
import { TextInputWithRemainingChars } from '../../common/textInputWithRemainingChars';
import RichTextEditor from '../../common/richTextEditor';
import { getContentLocale } from '../../../reducers/rootReducer';
import attachmentsPlugin from '../../common/richTextEditor/attachmentsPlugin';

export const TEXT_INPUT_MAX_LENGTH = 140;
export const TEXT_AREA_MAX_LENGTH = 3000;

type TopPostFormProps = {
  contentLocale: string,
  createPost: Function,
  ideaId: string,
  refetchIdea: Function,
  uploadDocument: Function
};

type TopPostFormState = {
  body: null | RawContentState,
  isActive: boolean,
  subject: string,
  submitting: boolean
};

class TopPostForm extends React.Component<*, TopPostFormProps, TopPostFormState> {
  props: TopPostFormProps;
  state: TopPostFormState;

  constructor() {
    super();
    this.state = {
      body: null,
      isActive: false,
      subject: '',
      submitting: false
    };
  }

  displayForm = (isActive) => {
    this.setState({
      isActive: isActive
    });
  };

  resetForm = () => {
    this.displayForm(false);
    this.setState({ subject: '' });
    this.setState({ body: null });
  };

  createTopPost = () => {
    const { contentLocale, createPost, ideaId, refetchIdea, uploadDocument } = this.props;
    const { body, subject } = this.state;
    this.setState({ submitting: true });
    const bodyIsEmpty = !body || rawContentStateIsEmpty(body);
    if (subject && !bodyIsEmpty) {
      // first, we upload each attachment
      const uploadDocumentsPromise = attachmentsPlugin.uploadNewAttachments(body, uploadDocument);
      uploadDocumentsPromise.then((result) => {
        const variables = {
          contentLocale: contentLocale,
          ideaId: ideaId,
          subject: subject,
          // use the updated content state with new entities
          body: convertRawContentStateToHTML(result.contentState),
          attachments: result.documentIds
        };
        displayAlert('success', I18n.t('loading.wait'));

        createPost({ variables: variables })
          .then(() => {
            refetchIdea();
            displayAlert('success', I18n.t('debate.thread.postSuccess'));
            this.resetForm();
            this.setState({ submitting: false });
          })
          .catch((error) => {
            displayAlert('danger', error);
            this.setState({ submitting: false });
          });
      });
    } else if (!subject) {
      displayAlert('warning', I18n.t('debate.thread.fillSubject'));
      this.setState({ submitting: false });
    } else if (bodyIsEmpty) {
      displayAlert('warning', I18n.t('debate.thread.fillBody'));
      this.setState({ submitting: false });
    }
  };

  handleInputFocus = promptForLoginOr(() => {
    return this.displayForm(true);
  });

  updateBody = (newValue) => {
    this.setState({
      body: newValue
    });
  };

  handleSubjectChange = (e) => {
    this.setState({
      subject: e.target.value
    });
  };

  render() {
    return (
      <Row>
        <Col xs={12} sm={3} md={2} smOffset={1} mdOffset={2} className="no-padding">
          <div className="start-discussion-container">
            <div className="start-discussion-icon">
              <span className="assembl-icon-discussion color" />
            </div>
            <div className="start-discussion">
              <h3 className="dark-title-3 no-margin">
                <Translate value="debate.thread.startDiscussion" />
              </h3>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={7} md={6} className="no-padding">
          <div className="form-container">
            <FormGroup>
              <TextInputWithRemainingChars
                value={this.state.subject}
                label={I18n.t('debate.subject')}
                maxLength={TEXT_INPUT_MAX_LENGTH}
                handleTxtChange={this.handleSubjectChange}
                handleInputFocus={this.handleInputFocus}
              />
              {this.state.isActive
                ? <div className="margin-m">
                  <RichTextEditor
                    rawContentState={this.state.body}
                    handleInputFocus={this.handleInputFocus}
                    maxLength={TEXT_AREA_MAX_LENGTH}
                    placeholder={I18n.t('debate.insert')}
                    updateContentState={this.updateBody}
                    withAttachmentButton
                  />
                  <Button className="button-cancel button-dark btn btn-default left margin-l" onClick={this.resetForm}>
                    <Translate value="cancel" />
                  </Button>
                  <Button
                    className="button-submit button-dark btn btn-default right margin-l"
                    onClick={this.createTopPost}
                    style={{ marginBottom: '30px' }}
                    disabled={this.state.submitting}
                  >
                    <Translate value="debate.post" />
                  </Button>
                </div>
                : null}
            </FormGroup>
          </div>
        </Col>
        <Col xs={0} sm={1} md={2} />
      </Row>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    contentLocale: getContentLocale(state)
  };
};

export default compose(
  connect(mapStateToProps),
  graphql(createPostMutation, { name: 'createPost' }),
  graphql(uploadDocumentMutation, { name: 'uploadDocument' })
)(TopPostForm);