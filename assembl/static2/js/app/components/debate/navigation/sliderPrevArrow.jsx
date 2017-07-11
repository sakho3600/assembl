import React from 'react';
import PropTypes from 'prop-types';

class SliderPrevArrow extends React.Component {
  render() {
    const { className, style, onClick } = this.props;

    return (
      <div
        className={`${className} glyphicon glyphicon-chevron-left`}
        style={{ ...style, display: 'block', background: 'navy', left: '-15px' }}
        onClick={onClick}
      />
    );
  }
}

SliderPrevArrow.propTypes = {
  className: PropTypes.string,
  style: PropTypes.Object,
  onClick: PropTypes.func
};

export default SliderPrevArrow;