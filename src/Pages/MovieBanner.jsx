import React from "react";
import { useLocation } from "react-router-dom";
import playBtn from "../assets/playBtn.svg";
import { RiPlayListAddLine } from "react-icons/ri";

function MovieBanner() {
  const location = useLocation();
  const { data } = location.state || {};
  console.log(data);
  return (
    <div>
      <div className="relative">
        <div className={"w-full h-[80dvh]"}>
          <img
            src={`https://image.tmdb.org/t/p/w500/${data.backdrop_path}`}
            alt={data.poster_path}
            className={"w-full h-[80dvh] object-cover"}
          />
        </div>
        <div className="absolute top-0 w-full h-[80dvh] lg:p-10 bg-[linear-gradient(260deg,rgba(0,0,0,0.32)_1.2%,rgba(0,0,0,0.33)_47.01%,rgba(0,0,0,0.51)_100%)] flex flex-col justify-end items-start space-y-4">
          <h2 className={"text-heading-3 font-semibold "}>{data.title}</h2>
          <p className={"text-subtitle-2 font-medium"}>
            Release: {data.release_date}
          </p>
          <p className={"text-sm text-light-gray lg:w-1/3"}>{data.overview}</p>
          <div className={"flex gap-x-4"}>
            <button className={"playBtn"}>
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
    </div>
  );
}

export default MovieBanner;
