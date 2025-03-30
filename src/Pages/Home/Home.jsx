import React, { useState } from "react";
import LiveShow from "../../common/LiveShow";
import Movies from "../../common/Movies.jsx";

const Home = () => {
  const [dropdown, setDropdown] = useState(false);
  const [selected, setSelected] = useState("+880");
  const toggleDropdown = () => setDropdown(!dropdown);
  return (
    <>
      <div className="bgImg xl:px-16 px-5">
        <div className="w-full xl:w-4xl lg:w-2/3 space-y-4 py-7 lg:py-20 lg:space-y-10 ">
          <p className="text-white lg:text-subtitle-1 font-semibold mt-12 lg:mt-20">
            Welcome to BD Screens
          </p>
          <h1 className="text-subtitle-1 lg:text-heading-1 font-bold">
            Download Unlimited Movies, Drama, Music Video and More Content.
          </h1>
          <p className="text-sm lg:text-subtitle-2">
            Enjoy exclusive Music Video popular movies and Live shows. Subscribe
            BD Screen now{" "}
          </p>
          <div className="flex flex-col lg:flex-row justify-center lg:justify-start lg:items-center items-start">
            <div className="flex justify-start items-center">
              <div className="relative">
                <button onClick={toggleDropdown} className="numberBtn">
                  {selected}
                </button>
                {dropdown && (
                  <div className="numberDropdown">
                    <p onClick={() => setSelected("+880")}>+880</p>
                    <p onClick={() => setSelected("+91")}>+91</p>
                    <p onClick={() => setSelected("+193")}>+193</p>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Enter your phone number"
                className="bg-white px-6 py-4 text-primary-black"
              />
            </div>
            <button className="bg-primaryColor  px-6 py-4 mt-5 lg:mt-0 cursor-pointer ">
              Subscribe
            </button>
          </div>
        </div>
      </div>
      <LiveShow
        title={"Watch Now"}
        imgDiv={"lg:w-40 w-16 h-28 lg:h-20"}
        watchBtn={"Watch"}
        category={
          "discover/tv?include_adult=false&include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc"
        }
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
        title={"Trending Movies"}
        category={"movie/upcoming?language=en-US&page=1"}
      />
    </>
  );
};

export default Home;
