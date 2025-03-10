import React from "react";
import Navbar from "../../common/Navbar";
import result from "../../lib/ApiData";
const Home = () => {
  console.log(result);

  return (
    <div>
      <Navbar />
    </div>
  );
};

export default Home;
