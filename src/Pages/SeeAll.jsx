import React, { useEffect, useState } from "react";
import ApiData from "../lib/ApiData.js";
import { useLocation } from "react-router-dom";
import Button from "../common/Button.jsx";

function SeeAll() {
  const location = useLocation();
  const { category, title } = location.state || {
    category: "",
    title: "",
  };
  console.log("Category:", category, "title:", title);
  const [result, setResult] = useState([]);
  useEffect(() => {
    ApiData(category)
      .then((data) => {
        setResult(data);
        console.log("Fetched Data:", data);
      })
      .catch((err) => {
        console.error("Error from SeeAll", err);
      });
  }, [category]);
  console.log(result);
  return (
    <div>
      <h1
        className={
          "text-center text-heading-4 lg:text-heading-3 font-semibold my-5"
        }
      >
        {title}
      </h1>
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {result?.map((item) => (
            <div key={item.id} className={"rounded-lg"}>
              <img
                src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                alt={item.title}
                className="w-full h-auto"
              />
              <div className={"flex flex-col justify-center text-center"}>
                <h3
                  className={
                    "text-subtitle-2 2xl:text-subtitle-1 font-semibold"
                  }
                >
                  {item.title || item.name}
                </h3>
                <p className={"text-sm lg:text-subtitle-2 font-medium"}>
                  Release: {item.release_date || item.first_air_date}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className={"flex justify-center items-center mt-10"}>
          <Button btnContent={"Load More"} />
        </div>
      </div>
    </div>
  );
}

export default SeeAll;
