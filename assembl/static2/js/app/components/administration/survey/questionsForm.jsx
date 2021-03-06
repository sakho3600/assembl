import React from 'react';
import { connect } from 'react-redux';
import { FormGroup, OverlayTrigger } from 'react-bootstrap';

import { addQuestionTooltip } from '../../common/tooltips';
import QuestionTitle from './questionTitle';
import { addQuestionToThematic } from '../../../actions/adminActions';

const QuestionsForm = ({ addQuestion, selectedLocale, thematicId, questions }) => {
  return (
    <div className={thematicId ? 'form-container' : 'hidden'}>
      <div className="margin-xl">
        {questions.map((question, index) => {
          return (
            <FormGroup key={index}>
              <QuestionTitle
                thematicId={thematicId}
                qIndex={index}
                titleEntries={question.titleEntries}
                selectedLocale={selectedLocale}
              />
            </FormGroup>
          );
        })}
        <OverlayTrigger placement="top" overlay={addQuestionTooltip}>
          <div onClick={addQuestion} className="plus margin-l">
            +
          </div>
        </OverlayTrigger>
      </div>
    </div>
  );
};

export const mapStateToProps = ({ admin: { thematicsById, thematicsInOrder } }, { thematicId }) => {
  return {
    thematics: thematicsInOrder,
    questions: thematicsById.get(thematicId).get('questions').toJS()
  };
};

export const mapDispatchToProps = (dispatch, { thematicId, selectedLocale }) => {
  return {
    addQuestion: () => {
      return dispatch(addQuestionToThematic(thematicId, selectedLocale));
    }
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(QuestionsForm);