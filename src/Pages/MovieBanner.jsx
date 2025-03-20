import React, { useEffect, useState } from "react";
// import { useLocation } from "react-router-dom";
import Slider from "react-slick";
import playBtn from "../assets/playBtn.svg";
import { RiPlayListAddLine } from "react-icons/ri";
import ApiData from "../lib/ApiData";
import LiveShow from "../common/LiveShow.jsx";
import Movies from "../common/Movies.jsx";

function MovieBanner() {
  var settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    autoplay: true,
    slidesToScroll: 1,
    cssEase: "linear",
    arrows: true,
    pauseOnHover: false,
  };
  const [API, setAPI] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await ApiData("movie/top_rated?language=en-US&page=1");
        setAPI(data);
        console.log("Fetched Data:", data);
      } catch (error) {
        console.error("Error Fetching Data:", error);
      }
    };
    fetchData();
  }, []);
  console.log(API);
  // const location = useLocation();
  // const { data } = location.state || {};
  // console.log(data);
  return (
    <div>
      <Slider {...settings}>
        {API?.map((data, index) => (
          <div key={index} className="relative">
            <div className={"w-full h-[80dvh]"}>
              <img
                src={`https://image.tmdb.org/t/p/w500/${data.backdrop_path}`}
                alt={data.poster_path}
                className={"w-full h-[80dvh] object-cover"}
              />
            </div>
            <div className="absolute top-0 w-full h-[80dvh] p-5 lg:p-10 bg-[linear-gradient(260deg,rgba(0,0,0,0.32)_1.2%,rgba(0,0,0,0.33)_47.01%,rgba(0,0,0,0.51)_100%)] flex flex-col justify-end items-start space-y-4">
              <h2
                className={"text-subtitle-1 lg:text-heading-3 font-semibold "}
              >
                {data.title}
              </h2>
              <p className={"text-sm lg:text-subtitle-2 font-medium"}>
                Release: {data.release_date}
              </p>
              <p
                className={
                  "text-sm text-light-gray w-4/5 lg:w-1/3 truncate lg:overflow-visible lg:whitespace-normal"
                }
              >
                {data.overview}
              </p>
              <div className={"flex flex-col lg:flex-row gap-4 w-full"}>
                <button className={"playBtn "}>
                  <span>
                    <img src={playBtn} alt={playBtn} />
                  </span>
                  <span className={"font-semibold"}>Play Now</span>
                </button>
                <button className={"playBtn"}>
                  <span className={"text-subtitle-2"}>
                    <RiPlayListAddLine />
                  </span>
                  <span className={"font-semibold"}>Watch list</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </Slider>
      <LiveShow
        title={"Watch Now"}
        imgDiv={"lg:w-40 w-16 h-28 lg:h-20"}
        watchBtn={"Watch"}
        category={"movie/upcoming?language=en-US&page=1"}
        containerDiv={"imageSlide_container"}
        slideNumber={4}
      />
      <Movies
        title={"Most Popular"}
        category={"movie/now_playing?language=en-US&page=1"}
      />
      <Movies
        title={"Movies for you"}
        category={
          "discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc"
        }
      />
      <Movies
        title={"Latest Bangla Music"}
        category={"movie/upcoming?language=en-US&page=1"}
      />
    </div>
  );
}

export default MovieBanner;
