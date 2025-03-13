import React from "react";
import PropTypes from "prop-types";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import result from "../lib/ApiData";

Movies.propTypes = {
  title: PropTypes.string,
};

function Movies({ title }) {
  const settings = {
    dots: false,
    infinite: true,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    speed: 2000,
    autoplaySpeed: 2000,
    cssEase: "linear",
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 3,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 2,
          initialSlide: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
    ],
  };
  return (
    <div className="mt-10 px-8">
      <h2 className="font-bold text-heading-4 mb-10">{title}</h2>
      <Slider {...settings}>
        {result.map((item) => (
          <div
            key={item.id}
            className={
              "!flex cursor-pointer hover:scale-105 transition-all duration-100 !flex-col !justify-center text-center !items-center relative"
            }
          >
            <div className={"lg:w-64 w-16 h-28 lg:h-auto movieImgCard"}>
              <img
                src={item.primaryImage}
                alt={item.title}
                className="object-cover w-full h-full"
              />
            </div>
            <div className={"absolute bottom-0 w-full movieTitleCard "}>
              <h3 className="text-xs lg:text-base 2xl:text-subtitle-2 font-semibold">
                {item.primaryTitle}
              </h3>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default Movies;
