import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import ApiData from "../lib/ApiData";
import { FaArrowRightLong } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
// import APIResult from "../lib/ApiData";

Movies.propTypes = {
  title: PropTypes.string,
  category: PropTypes.string,
};

function Movies({ title, category }) {
  const navigate = useNavigate();
  const [result, setResult] = useState([]);
  useEffect(() => {
    ApiData(category)
      .then((data) => {
        console.log("Fetched Data:", data);
        setResult(data);
      })
      .catch((error) => console.error("Error Fetching Data:", error));
  }, [category]);

  const settings = {
    dots: false,
    infinite: true,
    slidesToShow: 5,
    slidesToScroll: 1,
    speed: 500,
    cssEase: "linear",
    arrows: true,
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
  const handleClick = (data) => {
    navigate("/WatchMovie", { state: { data } });
    console.log(data);
  };
  return (
    <div className="mt-5 xl:mt-10 px-8 lg:mt-7 ">
      <div
        className={
          "flex justify-between items-center flex-row lg:mb-7 mb-5 xl:mb-10 w-full"
        }
      >
        <h2 className="font-bold text-subtitle-2 lg:text-subtitle-2 xl:text-heading-4 ">
          {title}
        </h2>
        <div
          className={
            "flex justify-center items-center gap-x-4 cursor-pointer hover:scale-105"
          }
          onClick={() => navigate("/see-all", { state: { category, title } })}
        >
          <span>See all</span>
          <span className={"text-primaryColor"}>
            <FaArrowRightLong />
          </span>
        </div>
      </div>
      <Slider {...settings}>
        {result?.map((item) => (
          <div
            key={item.id}
            onClick={() => handleClick(item)}
            className={
              "!flex cursor-pointer hover:scale-105 transition-all duration-100 !flex-col !justify-center text-center !items-center relative"
            }
          >
            <div className={"lg:w-64 w-16 h-28 lg:h-auto movieImgCard"}>
              <img
                src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                alt={item.title}
                className="object-cover w-full h-full"
              />
            </div>
            <div className={"absolute bottom-0 w-full movieTitleCard "}>
              <h3 className="text-xs lg:text-base 2xl:text-subtitle-2 font-semibold">
                {item.title}
              </h3>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default Movies;
