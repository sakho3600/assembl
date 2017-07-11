import React from 'react';
import PropTypes from 'prop-types';
import Slider from 'react-slick';
import { Row, Col } from 'react-bootstrap';
import { get } from '../../../utils/routeMap';

import SliderSettings from '../navigation/sliderSettings';
import ThematicPreview from './thematicPreview';

class ThematicList extends React.Component {
  renderThematicList() {
    const { thematics, identifier, slug } = this.props;
    return thematics.map((thematic, index) => {
      return (
        <Col key={index} xs={12} sm={6} md={3} className={'theme no-padding'}>
          <ThematicPreview
            imgUrl={thematic.imgUrl}
            numPosts={thematic.numPosts}
            numContributors={thematic.numContributors}
            link={`${get('debate', { slug: slug, phase: identifier })}${get('theme', { themeId: thematic.id })}`}
            title={thematic.title}
            description={thematic.description}
          />
        </Col>
      );
    });
  }

  render() {
    const { thematics } = this.props;

    return (
      <Row className="no-margin">
        { thematics.length > 4 &&
          <Slider {...SliderSettings}>
            { this.renderThematicList() }
          </Slider>
        }
        { thematics.length < 5 && this.renderThematicList() }
      </Row>
    );
  }
}

ThematicList.propTypes = {
  thematics: PropTypes.Array.isRequired,
  identifier: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired
};

export default ThematicList;