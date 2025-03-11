import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./Pages/Home/Home";
import Index from "./Pages/Index";
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
