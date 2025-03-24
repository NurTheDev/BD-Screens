import React, { useEffect, useState } from "react";
import ApiData from "../lib/ApiData.js";
import { useNavigate } from "react-router-dom";

function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [API, setAPI] = useState([]);
  console.log("Search:", search);
  useEffect(() => {
    if (!search.trim()) return setAPI([]);
    const fetchData = async () => {
      try {
        const data = await ApiData(`search/movie?query=${search}`);
        setAPI(data);
        console.log("Fetched Data:", data);
      } catch (error) {
        console.error("Error Fetching Data:" + error);
      }
    };
    fetchData();
  }, [search]);
  console.log(API);
  const handleClick = (data) => {
    navigate("/WatchMovie", { state: { data } });
    console.log(data);
  };
  return (
    <div className={"xl:px-16 px-5"}>
      <div className={"flex md:w-2/3 lg:w-1/2 mx-auto mt-10 px-4"}>
        <input
          type="text"
          placeholder="Search your movie"
          className="bg-white px-6 py-4 text-primary-black w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="bg-primaryColor  px-6 py-4 lg:mt-0 cursor-pointer ">
          Search
        </button>
      </div>
      <div>
        {API.length > 0 && (
          <h2 className={"text-heading-4 font-semibold mt-10"}>
            Search Result
          </h2>
        )}
        <div
          className={"flex flex-wrap gap-4 items-center justify-between mt-10"}
        >
          {search && API.length === 0 && (
            <h2 className={"text-heading-4 font-semibold text-center w-full"}>
              No Result Found
            </h2>
          )}
          {API?.map((data, index) => (
            <div
              key={index}
              onClick={() => handleClick(data)}
              className={
                "w-2/5 lg:w-1/6 flex flex-col items-center hover:scale-105 transition-all duration-100 cursor-pointer"
              }
            >
              <img
                src={`https://image.tmdb.org/t/p/w500/${data.poster_path}`}
                alt={data.poster_path}
              />
              <div className={"space-y-2 mt-2 text-center"}>
                <h2 className={"lg:text-subtitle-1 font-semibold"}>
                  {data.title}
                </h2>
                <p className={"text-light-gray text-sm lg:text-base"}>
                  Release: {data.release_date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;
