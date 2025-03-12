import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import result from "../lib/ApiData";

const LiveShow = () => {
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
  };
console.log(result);

  return (
    <div className="mt-10 px-8">
      <h2 className="font-bold text-heading-4 mb-10">Watch Now</h2>
      <Slider {...settings}>
        {result.map((item) => (
          <div key={item.id} className="!flex !flex-row !justify-center !gap-x-4 !items-center">
            <div className="w-72 h-96">
              <img src={item.primaryImage} alt={item.title} className="object-cover w-52" />
            </div>
            <div>
              <h1 className="text-subtitle-1 font-semibold">{item.primaryTitle}</h1>
              <p className="font-medium">{item.type}</p>
              <button className="py-1 px-2 text-primaryColor text-sm border border-primaryColor mt-8 hover:text-white transition-all duration-100 hover:scale-95">Watch now</button>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default LiveShow;
