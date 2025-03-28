import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Index from "./Pages/Index";
import MovieBanner from "./Pages/MovieBanner.jsx";
import WatchMovie from "./Pages/WatchMovie.jsx";
import SearchPage from "./Pages/SearchPage.jsx";
import Error from "./Pages/Error.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<Index />}>
          <Route index element={<Home />} />
          <Route path="movie" element={<MovieBanner />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="music-video" element={<Error />} />
          <Route path="live-show" element={<Error />} />
          <Route path="comedies" element={<Error />} />
          <Route path="drama" element={<Error />} />
          <Route path={"WatchMovie"} element={<WatchMovie />} />
          <Route path="*" element={<Error />} />
        </Route>
        <Route path="signin" element={<Signin />} />
        <Route path="signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
