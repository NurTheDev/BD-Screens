import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import playBtn from "../assets/playBtn.svg";
import { RiPlayListAddLine } from "react-icons/ri";
import { IoShareSocial } from "react-icons/io5";
import { FiDownload } from "react-icons/fi";
import ApiData from "../lib/ApiData";
import Movies from "../common/Movies.jsx";
// import PropTypes from 'prop-types';
//
// WatchMovie.propTypes = {};

function WatchMovie() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [API, setAPI] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const APIData = await ApiData("movie/top_rated?language=en-US&page=1");
        setAPI(APIData);
      } catch (error) {
        console.error("Error Fetching Data:", error);
      }
    };
    fetchData();
  }, []);
  const location = useLocation();
  const { data } = location.state || {};
  console.log(data);
  const handlePlayBtn = () => {
    setModal(true);
  };
  const handleClick = (data) => {
    navigate("/WatchMovie", { state: { data } });
  };
  return (
    <div className={"xl:px-16 px-5"}>
      {modal && (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
          <div role="alert" className="alert alert-warning lg:w-1/2 mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className={"lg:text-subtitle-1 font-semibold"}>
              You need to login first
            </span>
            <button
              className="btn btn-outline btn-error"
              onClick={() => setModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className={`grid grid-cols-12 mt-5 ${modal && "blur"}`}>
        <div className={"lg:col-span-9 col-span-12"}>
          <div className={"w-full h-[80dvh] relative "}>
            <img
              src={`https://image.tmdb.org/t/p/w500/${data.backdrop_path}`}
              alt={data.poster_path}
              className={
                "w-full h-[80dvh] object-cover bg-black-medium opacity-50"
              }
            />
            <span className={"absolute top-1/2 left-1/2"}>
              <img
                src={playBtn}
                alt={playBtn}
                className={"cursor-pointer lg:w-16"}
                onClick={handlePlayBtn}
              />
            </span>
          </div>
          <div
            className={
              "mt-4 lg:mt-10 flex flex-col lg:flex-row justify-between"
            }
          >
            <div className={" space-y-4"}>
              <h2
                className={"text-subtitle-1 lg:text-heading-3 font-semibold "}
              >
                {data.title || data.name}
              </h2>
              <p className={"text-sm lg:text-subtitle-2 font-medium"}>
                Release: {data.release_date || data.first_air_date}
              </p>
            </div>
            <div className={"flex gap-4 lg:gap-10 mt-5 lg:mt-0"}>
              <div className={"watchIcon"}>
                <span className={"text-subtitle-2"}>
                  <RiPlayListAddLine />
                </span>
                <span>Watchlist</span>
              </div>
              <div className={"watchIcon"}>
                <span className={"text-subtitle-2"}>
                  <IoShareSocial />
                </span>
                <span>share</span>
              </div>
              <div className={"watchIcon"}>
                <span className={"text-subtitle-2"}>
                  <FiDownload />
                </span>
                <span>Download</span>
              </div>
            </div>
          </div>
          <div className={"space-y-5 mt-5 lg:mt-10"}>
            <p className={"text-subtitle-1"}>Description</p>
            <p className={"text-sm text-light-gray lg:w-2/3"}>
              {data.overview}
            </p>
          </div>
        </div>
        <div className={"lg:col-span-3 col-span-12 mt-8 lg:mt-0"}>
          <h2 className={"text-heading-4 font-semibold lg:px-6 mb-8"}>
            Movies for you
          </h2>
          <div
            className={
              "flex flex-wrap items-center justify-between lg:px-6 gap-4 overflow-x-hidden lg:h-[80vh]"
            }
          >
            {API?.map((item) => (
              <div
                key={item.id}
                className={
                  "flex flex-col items-center justify-center text-center w-[45%] cursor-pointer hover:scale-105 transition-all duration-100"
                }
                onClick={() => handleClick(item)}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                  alt={item.title}
                />
                <h3
                  className={
                    "text-xs lg:text-base xl:text-subtitle-2 font-semibold"
                  }
                >
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Movies
        title={"Related Videos"}
        category={
          "discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc"
        }
      />
    </div>
  );
}

export default WatchMovie;
