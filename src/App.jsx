import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./Pages/Home/Home";
import Index from "./Pages/Index";
import MovieBanner from "./Pages/MovieBanner.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />}>
          <Route path="home" element={<Home />} />
          <Route path="movie" element={"Movie"} />
          <Route path="drama" element={"Drama"} />
          <Route path="music-video" element={"Music Video"} />
          <Route path="live-show" element={"Live Show"} />
          <Route path="comedies" element={"Comedies"} />
          <Route path="MovieBanner" element={<MovieBanner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
