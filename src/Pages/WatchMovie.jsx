import React from "react";
import { useLocation } from "react-router-dom";
import playBtn from "../assets/playBtn.svg";
// import PropTypes from 'prop-types';
//
// WatchMovie.propTypes = {};

function WatchMovie() {
  const location = useLocation();
  const { data } = location.state || {};
  console.log(data);
  return (
    <div className={"xl:px-16 px-5"}>
      <div className={"grid grid-cols-12 mt-5"}>
        <div className={"col-span-9"}>
          <div className={"w-full h-[80dvh] relative "}>
            <img
              src={`https://image.tmdb.org/t/p/w500/${data.backdrop_path}`}
              alt={data.poster_path}
              className={
                "w-full h-[80dvh] object-cover bg-black-medium opacity-50"
              }
            />
            <span className={"absolute top-1/2 left-1/2 w-full h-full "}>
              <img
                src={playBtn}
                alt={playBtn}
                className={"cursor-pointer lg:w-16"}
              />
            </span>
          </div>
          <div className={"mt-4 lg:mt-10"}>
            <div className={" space-y-4"}>
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
                  "text-sm text-light-gray w-4/5 lg:w-2/3 truncate lg:overflow-visible lg:whitespace-normal"
                }
              >
                {data.overview}
              </p>
            </div>
            <div></div>
          </div>
        </div>
        <div className={"col-span-3"}></div>
      </div>
    </div>
  );
}

export default WatchMovie;
