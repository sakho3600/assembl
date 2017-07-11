import React from 'react';
import PropTypes from 'prop-types';

class SliderNextArrow extends React.Component {
  render() {
    const { className, style, onClick } = this.props;

    return (
      <div
        className={`${className} glyphicon glyphicon-chevron-right`}
        style={{ ...style, display: 'block', background: 'navy', right: '-15px' }}
        onClick={onClick}
      />
    );
  }
}

SliderNextArrow.propTypes = {
  className: PropTypes.string,
  style: PropTypes.Object,
  onClick: PropTypes.func
};

export default SliderNextArrow;