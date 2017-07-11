import React from 'react';

class SliderPrevArrow extends React.Component {
  render() {
    const { className, style, onClick } = this.props;
    return (
    <div
      className={className + ' glyphicon glyphicon-chevron-left'}
      style={{...style, display: 'block', background: 'navy', left: '-15px' }}
      onClick={onClick}
    />
    );
  }
}

export default SliderPrevArrow;