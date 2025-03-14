import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import ApiData from "../lib/ApiData";

const LiveShow = ({
  title,
  category,
  imgDiv,
  watchBtn,
  containerDiv,
  slideNumber,
}) => {
  const [result, setResult] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await ApiData({ category });
        setResult(data);
      } catch {
        console.error;
        ("Error Fetching Data");
      }
    };
    fetchData();
  }, []);
  const settings = {
    dots: false,
    infinite: true,
    slidesToShow: parseInt(slideNumber),
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
    <div className="mt-5 lg:mt-7 xl:mt-10 px-8">
      <h2 className="font-bold text-subtitle-2 lg:text-subtitle-2 xl:text-heading-4 lg:mb-7 mb-5 xl:mb-10">
        {title}
      </h2>
      <Slider {...settings}>
        {result.map((item) => (
          <div key={item.id} className={containerDiv}>
            <div className={imgDiv}>
              <img
                src={item.primaryImage}
                alt={item.title}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h1 className="text-xs lg:text-base 2xl:text-subtitle-1 font-semibold">
                {item.primaryTitle}
              </h1>
              <p className="font-medium hidden lg:block">{item.type}</p>
              {watchBtn && (
                <button className="py-1 px-2 text-primaryColor text-sm border border-primaryColor mt-8 hover:text-white transition-all duration-100 hover:scale-95 hidden 2xl:block">
                  {watchBtn}
                </button>
              )}
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};
LiveShow.propTypes = {
  title: PropTypes.string,
  imgDiv: PropTypes.string,
  watchBtn: PropTypes.string,
  containerDiv: PropTypes.string,
  slideNumber: PropTypes.number,
};
export default LiveShow;
