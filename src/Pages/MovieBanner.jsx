import React from "react";
import { useLocation } from "react-router-dom";

function MovieBanner() {
  const location = useLocation();
  const { data } = location.state || {};
  console.log(data);
  return (
    <div>
      <div className={"w-full h-screen"}>
        <img
          src={`https://image.tmdb.org/t/p/w500/${data.backdrop_path}`}
          alt={data.poster_path}
          className={"w-full h-[80dvh] object-cover"}
        />
      </div>
    </div>
  );
}

export default MovieBanner;
