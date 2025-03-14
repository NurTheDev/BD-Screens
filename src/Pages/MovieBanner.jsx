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
          src={data.primaryImage}
          alt={data.primaryImage}
          className={"w-full h-[80dvh] object-cover"}
        />
      </div>
    </div>
  );
}

export default MovieBanner;
