import React from 'react';
import { connect } from 'react-redux';
import { Button, OverlayTrigger } from 'react-bootstrap';
import { I18n } from 'react-redux-i18n';

import { removeQuestion, updateQuestionTitle } from '../../../actions/adminActions';
import FormControlWithLabel from '../../common/formControlWithLabel';
import { deleteQuestionTooltip } from '../../common/tooltips';

const QuestionsTitle = ({ titleEntries, qIndex, remove, selectedLocale, updateTitle }) => {
  const titleEntry = titleEntries.find((entry) => {
    return entry.localeCode === selectedLocale;
  });
  const title = titleEntry ? titleEntry.value : '';
  const label = `${I18n.t('administration.question_label')} ${qIndex + 1} ${selectedLocale.toUpperCase()}`;
  return (
    <div className="question-section">
      <FormControlWithLabel
        componentClass="textarea"
        className="text-area"
        label={label}
        required
        value={title}
        onChange={(e) => {
          return updateTitle(e.target.value);
        }}
      />
      <div className="pointer right margin-s">
        <OverlayTrigger placement="top" overlay={deleteQuestionTooltip}>
          <Button onClick={remove}>
            <span className="assembl-icon-delete grey" />
          </Button>
        </OverlayTrigger>
      </div>
    </div>
  );
};

export const mapDispatchToProps = (dispatch, { thematicId, qIndex, selectedLocale }) => {
  return {
    updateTitle: (value) => {
      return dispatch(updateQuestionTitle(thematicId, qIndex, selectedLocale, value));
    },
    remove: () => {
      return dispatch(removeQuestion(thematicId, qIndex));
    }
  };
};
export default connect(null, mapDispatchToProps)(QuestionsTitle);