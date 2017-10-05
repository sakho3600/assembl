// @flow
import React from 'react';
import { compose, graphql, withApollo } from 'react-apollo';
import { connect } from 'react-redux';
import { Row, Col, FormGroup, Button } from 'react-bootstrap';
import { Translate, I18n } from 'react-redux-i18n';
import { RawContentState } from 'draft-js';

import deletePostAttachmentMutation from '../../../graphql/mutations/deletePostAttachment.graphql';
import uploadDocumentMutation from '../../../graphql/mutations/uploadDocument.graphql';
import updatePostMutation from '../../../graphql/mutations/updatePost.graphql';
import { displayAlert, inviteUserToLogin } from '../../../utils/utilityManager';
import { getConnectedUserId } from '../../../utils/globalFunctions';
import { convertToRawContentState, convertRawContentStateToHTML, rawContentStateIsEmpty } from '../../../utils/draftjs';
import RichTextEditor from '../../common/richTextEditor';
import attachmentsPlugin from '../../common/richTextEditor/attachmentsPlugin';
import type { UploadNewAttachmentsPromiseResult } from '../../common/richTextEditor/attachmentsPlugin';
import { TextInputWithRemainingChars } from '../../common/textInputWithRemainingChars';
import { TEXT_INPUT_MAX_LENGTH, TEXT_AREA_MAX_LENGTH } from './topPostForm';
import { getContentLocale } from '../../../reducers/rootReducer';

type EditPostFormProps = {
  contentLocale: string,
  body: string,
  id: string,
  subject: string,
  readOnly: boolean,
  modifiedOriginalSubject: string,
  goBackToViewMode: Function,
  client: Object,
  refetchIdea: Function,
  uploadDocument: Function,
  updatePost: Function
};

type EditPostFormState = {
  subject: string,
  body: RawContentState
};

class EditPostForm extends React.PureComponent<void, EditPostFormProps, EditPostFormState> {
  props: EditPostFormProps;
  state: EditPostFormState;

  constructor(props: EditPostFormProps) {
    super(props);
    const { subject } = props;
    const body = props.body || '';
    this.state = {
      body: convertToRawContentState(body),
      subject: subject
    };
  }

  updateSubject = (e: SyntheticEvent): void => {
    if (e.target instanceof HTMLInputElement) {
      this.setState({ subject: e.target.value });
    }
  };

  updateBody = (rawBody: RawContentState): void => {
    this.setState({ body: rawBody });
  };

  handleCancel = (): void => {
    this.props.goBackToViewMode();
  };

  handleInputFocus = () => {
    const isUserConnected = getConnectedUserId(); // TO DO put isUserConnected in the store
    if (!isUserConnected) {
      inviteUserToLogin();
    }
  };

  handleSubmit = (): void => {
    const { uploadDocument, updatePost } = this.props;
    const { body } = this.state;
    const subjectIsEmpty = this.state.subject.length === 0;
    const bodyIsEmpty = rawContentStateIsEmpty(body);
    if (!subjectIsEmpty && !bodyIsEmpty) {
      // first we upload the new documents
      const uploadDocumentsPromise = attachmentsPlugin.uploadNewAttachments(body, uploadDocument);
      uploadDocumentsPromise.then((result: UploadNewAttachmentsPromiseResult) => {
        if (!result.contentState) {
          return;
        }

        const variables = {
          contentLocale: this.props.contentLocale,
          postId: this.props.id,
          subject: this.state.subject,
          body: convertRawContentStateToHTML(result.contentState),
          attachments: result.documentIds
        };
        displayAlert('success', I18n.t('loading.wait'));
        const oldSubject = this.props.subject;
        updatePost({ variables: variables })
          .then(() => {
            this.props.refetchIdea();
            displayAlert('success', I18n.t('debate.thread.postSuccess'));
            this.props.goBackToViewMode();
            if (oldSubject !== this.state.subject) {
              // If we edited the subject, we need to reload all descendants posts,
              // we do this by calling resetStore which will refetch all mounted queries.
              // Descendants are actually a subset of mounted queries, so we overfetch here.
              // This is fine, editing a subject should be a rare action.
              this.props.client.resetStore();
            }
          })
          .catch((error) => {
            displayAlert('danger', error);
          });
      });
    } else if (subjectIsEmpty) {
      displayAlert('warning', I18n.t('debate.thread.fillSubject'));
    } else if (bodyIsEmpty) {
      displayAlert('warning', I18n.t('debate.thread.fillBody'));
    }
  };

  render() {
    return (
      <Row>
        <Col xs={12} md={12}>
          <div className="color margin-left-9">
            <span className="assembl-icon-edit" />&nbsp;<Translate value="debate.edit.title" className="sm-title" />
          </div>
        </Col>
        <Col xs={12} md={12}>
          <div className="answer-form-inner">
            {this.props.readOnly
              ? <div>
                <h3 className="dark-title-3">
                  {this.props.modifiedOriginalSubject}
                </h3>
                <div className="margin-m" />
              </div>
              : <TextInputWithRemainingChars
                alwaysDisplayLabel
                label={I18n.t('debate.edit.subject')}
                value={this.state.subject}
                handleTxtChange={this.updateSubject}
                maxLength={TEXT_INPUT_MAX_LENGTH}
              />}
            <FormGroup>
              <RichTextEditor
                rawContentState={this.state.body}
                placeholder={I18n.t('debate.edit.body')}
                updateContentState={this.updateBody}
                maxLength={TEXT_AREA_MAX_LENGTH}
                withAttachmentButton
              />

              <div className="button-container">
                <Button className="button-cancel button-dark btn btn-default left" onClick={this.handleCancel}>
                  <Translate value="cancel" />
                </Button>
                <Button className="button-submit button-dark btn btn-default right" onClick={this.handleSubmit}>
                  <Translate value="debate.post" />
                </Button>
              </div>
            </FormGroup>
          </div>
        </Col>
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
  graphql(uploadDocumentMutation, { name: 'uploadDocument' }),
  graphql(deletePostAttachmentMutation, { name: 'deletePostAttachment' }),
  graphql(updatePostMutation, { name: 'updatePost' }),
  withApollo
)(EditPostForm);