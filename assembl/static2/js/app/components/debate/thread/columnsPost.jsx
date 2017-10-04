import React from 'react';
import { Translate } from 'react-redux-i18n';
import { compose, graphql } from 'react-apollo';
import { Row, Col } from 'react-bootstrap';

import Attachments from '../../common/attachments';
import ProfileLine from '../../common/profileLine';
import PostTranslate from '../common/postTranslate';
import PostActions from './postActions';
import AnswerForm from './answerForm';
import EditPostForm from './editPostForm';
import DeletedPost from './deletedPost';
import PostQuery from '../../../graphql/PostQuery.graphql';
import { DeletedPublicationStates, PublicationStates } from '../../../constants';
import withLoadingIndicator from '../../../components/common/withLoadingIndicator';
import Nuggets from './nuggets';
import { EmptyPost } from './post';

// TODO we need a graphql query to retrieve all languages with native translation, see Python langstrings.LocaleLabel
// We only have french and english for en, fr, ja for now.

class ColumnsPost extends EmptyPost {
  render() {
    const {
      id,
      bodyEntries,
      bodyMimeType,
      indirectIdeaContentLinks,
      creator,
      modificationDate,
      sentimentCounts,
      mySentiment,
      publicationState,
      attachments,
      extracts
    } = this.props.data.post;

    const { lang, ideaId, refetchIdea, creationDate, numChildren, routerParams, debateData } = this.props;

    // Fake nColumns props
    const columnColor = 'green';
    const columnText = 'En faveur de l\'Inclusive City Bond';

    // creationDate is retrieved by IdeaWithPosts query, not PostQuery
    let body;
    let originalBodyLocale;
    let originalBody;
    if (bodyEntries.length > 1) {
      // first entry is the translated version, example localeCode "fr-x-mtfrom-en"
      // second entry is the original, example localeCode "en"
      body = this.state.showOriginal ? bodyEntries[1].value : bodyEntries[0].value;
      originalBodyLocale = bodyEntries[1].localeCode;
      originalBody = bodyEntries[1].value;
    } else {
      // translation is not enabled or the message is already in the desired locale
      body = bodyEntries[0].value;
      originalBody = bodyEntries[0].value;
    }
    // This hack should be removed when the TDI's admin section will be done.
    // We need it to have several langString in the idea's title
    const ideaContentLinks = [];
    let titlesArray = [];
    indirectIdeaContentLinks.forEach((link) => {
      titlesArray = link.idea.title.split('#!');
      titlesArray.forEach((title) => {
        const titleLocale = title.split('$!')[1];
        if (titleLocale) {
          if (titleLocale.trim() === lang) {
            ideaContentLinks.push(title.split('$!')[0]);
          }
        } else {
          ideaContentLinks.push(link.idea.title);
        }
      });
    });
    // End of the hack

    if (publicationState in DeletedPublicationStates) {
      return <DeletedPost id={id} deletedBy={publicationState === PublicationStates.DELETED_BY_USER ? 'user' : 'admin'} />;
    }

    if (this.state.mode === 'edit') {
      return (
        <div className="posts">
          <div className="answer-form" id={id}>
            <EditPostForm
              attachments={attachments}
              id={id}
              body={originalBody}
              refetchIdea={refetchIdea}
              goBackToViewMode={this.goBackToViewMode}
              readOnly={!!this.props.parentId}
            />
          </div>
        </div>
      );
    }

    const answerTextareaRef = (el) => {
      this.answerTextarea = el;
    };
    return (
      <div className="posts" id={id}>
        <Nuggets extracts={extracts} postId={id} />
        <div className="box" style={{ borderLeftColor: columnColor }}>
          <Row className="post-row">
            <Col xs={12} md={11} className="post-left">
              {creator &&
                <ProfileLine
                  userId={creator.userId}
                  userName={creator.name}
                  creationDate={creationDate}
                  locale={lang}
                  modified={modificationDate !== null}
                />}
              <div className="column-hint" style={{ color: columnColor }}>
                {columnText}
              </div>
              {originalBodyLocale
                ? <PostTranslate
                  id={id}
                  showOriginal={this.state.showOriginal}
                  originalBodyLocale={originalBodyLocale}
                  toggle={() => {
                    return this.setState((state) => {
                      return { showOriginal: !state.showOriginal };
                    });
                  }}
                />
                : null}
              <div
                className={`body ${bodyMimeType === 'text/plain' ? 'pre-wrap' : ''}`}
                dangerouslySetInnerHTML={{ __html: body }}
              />

              <Attachments attachments={attachments} />

              {ideaContentLinks.length
                ? <div className="link-idea">
                  <div className="label">
                    <Translate value="debate.thread.linkIdea" />
                  </div>
                  <div className="badges">
                    {ideaContentLinks.map((title, index) => {
                      return (
                        <span className="badge" key={index}>
                          {title}
                        </span>
                      );
                    })}
                  </div>
                </div>
                : null}
              <div className="answers annotation">
                <Translate value="debate.thread.numberOfResponses" count={numChildren} />
              </div>
            </Col>
            <Col xs={12} md={1} className="post-right">
              <PostActions
                creatorUserId={creator.userId}
                postId={id}
                handleEditClick={this.handleEditClick}
                sentimentCounts={sentimentCounts}
                mySentiment={mySentiment}
                numChildren={numChildren}
                routerParams={routerParams}
                debateData={debateData}
              />
            </Col>
          </Row>
        </div>
        {this.state.showAnswerForm
          ? <div className="answer-form">
            <AnswerForm
              parentId={id}
              ideaId={ideaId}
              refetchIdea={refetchIdea}
              textareaRef={answerTextareaRef}
              hideAnswerForm={this.hideAnswerForm}
            />
          </div>
          : null}
      </div>
    );
  }
}

export default compose(graphql(PostQuery), withLoadingIndicator())(ColumnsPost);