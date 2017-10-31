import React from 'react';
import { Translate } from 'react-redux-i18n';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import Loader from '../components/common/loader';
import SynthesisQuery from '../graphql/SynthesisQuery.graphql';
import IdeaSynthesis from '../components/synthesis/IdeaSynthesis';

const synthesisMock = {
  title: 'My super synthesis',
  imageSrc:
    'http://www.evilenglish.net/wp-content/uploads/2014/05/305908d1359615600-madejski-miracle-wtf-shit_640_417_s_c1_center_top_0_0.jpg',
  body: 'Everything is awesomeeeeeeee!!',
  numContributors: 42,
  numPosts: 1337,
  ideaLink: '/ai-consultation/debate/thread/theme/SWRlYTo2Mzk='
};

export class DumbSynthesis extends React.Component {
  render() {
    const { data } = this.props;
    if (data.loading) {
      return <Loader color="black" />;
    }
    const { synthesis } = data;
    return (
      <div className="max-container">
        <Translate value="synthesis.title" />
        <IdeaSynthesis {...synthesisMock} />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    lang: state.i18n.locale
  };
};

export default compose(
  connect(mapStateToProps),
  graphql(SynthesisQuery, {
    options: (props) => {
      return {
        variables: { id: props.params.synthesisId }
      };
    }
  })
)(DumbSynthesis);