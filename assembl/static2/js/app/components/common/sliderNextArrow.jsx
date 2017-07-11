import React from 'react';

class SliderNextArrow extends React.Component {
  render() {
    const { className, style, onClick } = this.props;
    return (
    <div
      className={className + ' glyphicon glyphicon-chevron-right'}
      style={{...style, display: 'block', background: 'navy', right: '-15px' }}
      onClick={onClick}
    />
    );
  }
}

export default SliderNextArrow;