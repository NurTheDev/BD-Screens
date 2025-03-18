import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./Pages/Home/Home";
import Index from "./Pages/Index";
import MovieBanner from "./Pages/MovieBanner.jsx";
import WatchMovie from "./Pages/WatchMovie.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<Index />}>
          <Route index element={<Home />} />
          <Route path="movie" element={<MovieBanner />} />
          <Route path="drama" element={"Drama"} />
          <Route path="music-video" element={"Music Video"} />
          <Route path="live-show" element={"Live Show"} />
          <Route path="comedies" element={"Comedies"} />

          <Route path={"WatchMovie"} element={<WatchMovie />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
