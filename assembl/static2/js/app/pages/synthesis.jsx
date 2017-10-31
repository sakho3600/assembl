import React from 'react';
import { Translate } from 'react-redux-i18n';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import Loader from '../components/common/loader';
import SynthesisQuery from '../graphql/SynthesisQuery.graphql';
import IdeaSynthesis from '../components/synthesis/IdeaSynthesis';

export class Synthesis extends React.Component {
  render() {
    const { data, routeParams } = this.props;
    if (data.loading) {
      return <Loader color="black" />;
    }
    const { synthesis } = data;
    return (
      <div className="max-container">
        <Translate value="synthesis.title" />
        {synthesis.ideas && <IdeaSynthesis {...synthesis.ideas[0] || {}} slug={routeParams.slug} />}
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
)(Synthesis);