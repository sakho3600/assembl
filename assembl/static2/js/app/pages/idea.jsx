import React from 'react';
import { connect } from 'react-redux';
import { Translate } from 'react-redux-i18n';
import { compose, graphql } from 'react-apollo';
import { Grid } from 'react-bootstrap';

import Header from '../components/debate/common/header';
import IdeaQuery from '../graphql/IdeaQuery.graphql';
import IdeaWithPostsQuery from '../graphql/IdeaWithPostsQuery.graphql';
import InfiniteSeparator from '../components/common/infiniteSeparator';
import Post, { PostFolded } from '../components/debate/thread/post';
import GoUp from '../components/common/goUp';
import Tree from '../components/common/tree';
import Loader from '../components/common/loader';

import TopPostForm from './../components/debate/thread/topPostForm';

export const transformPosts = (edges, additionnalProps = {}) => {
  const postsByParent = {};
  edges.forEach((e) => {
    const p = { ...e.node, ...additionnalProps };
    const items = postsByParent[p.parentId] || [];
    postsByParent[p.parentId] = items;
    items.push(p);
  });

  const getChildren = (id) => {
    return (postsByParent[id] || []).map((post) => {
      const newPost = post;
      // We modify the object in place, we are sure it's already a copy from
      // the forEach edges above.
      newPost.children = getChildren(post.id);
      return newPost;
    });
  };

  return (postsByParent.null || []).map((p) => {
    const newPost = p;
    newPost.children = getChildren(p.id);
    return newPost;
  });
};

const noRowsRenderer = () => {
  return (
    <div className="center">
      <Translate value="debate.thread.noPostsInThread" />
    </div>
  );
};

class Idea extends React.Component {
  componentWillMount() {
    this.refetchIdea = this.props.ideaWithPostsData.refetch;
  }

  componentWillReceiveProps(nextProps) {
    // data.refetchIdea is a new instance each time Idea component is rerendered
    // so shallowEqual fails on Post components and we have a perf issue.
    // Keep the previous function if variables used in query didn't change.
    if (this.props.lang !== nextProps.lang || this.props.id !== nextProps.id) {
      this.refetchIdea = nextProps.ideaWithPostsData.refetch;
    }
  }

  render() {
    const { lang, activeAnswerFormId, ideaData, ideaWithPostsData } = this.props;
    if (ideaData.loading) {
      return (
        <div className="idea">
          <Loader />
        </div>
      );
    }

    const { idea } = ideaData;
    const topPosts =
      !ideaWithPostsData.loading &&
      transformPosts(ideaWithPostsData.idea.posts.edges, { refetchIdea: this.refetchIdea, ideaId: idea.id });

    return (
      <div className="idea">
        <Header title={idea.title} imgUrl={idea.imgUrl} identifier="thread" />
        <section className="post-section">
          <Grid fluid className="background-color">
            <div className="max-container">
              <div className="top-post-form">
                <TopPostForm ideaId={idea.id} refetchIdea={this.refetchIdea} />
              </div>
            </div>
          </Grid>
          <Grid fluid className="background-grey">
            <div className="max-container">
              <div className="content-section">
                {ideaWithPostsData.loading
                  ? <Loader />
                  : <Tree
                    lang={lang}
                    activeAnswerFormId={activeAnswerFormId}
                    data={topPosts}
                    InnerComponent={Post}
                    InnerComponentFolded={PostFolded}
                    noRowsRenderer={noRowsRenderer}
                    SeparatorComponent={InfiniteSeparator}
                  />}
              </div>
            </div>
          </Grid>
        </section>
        <GoUp />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    lang: state.i18n.locale,
    activeAnswerFormId: state.posts.activeAnswerFormId
  };
};

export default compose(
  connect(mapStateToProps),
  graphql(IdeaWithPostsQuery, { name: 'ideaWithPostsData' }),
  graphql(IdeaQuery, { name: 'ideaData' })
)(Idea);