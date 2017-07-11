import React from 'react';

import SliderPrevArrow from './sliderPrevArrow';
import SliderNextArrow from './sliderNextArrow';

const SliderSettings = {
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 4,
  slidesToScroll: 4,
  initialSlide: 0,
  responsive: [{
    breakpoint: 1024,
    settings: {
      slidesToShow: 3,
      slidesToScroll: 3,
      infinite: true,
      dots: false
    }
  }, {
    breakpoint: 600,
    settings: {
      slidesToShow: 2,
      slidesToScroll: 2,
      initialSlide: 2
    }
  }, {
    breakpoint: 480,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1
    }
  }],
  prevArrow: <SliderPrevArrow />,
  nextArrow: <SliderNextArrow />
};

export default SliderSettings;