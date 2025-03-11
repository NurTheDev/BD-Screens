import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../common/Navbar";


const Index = () => {
  return (
    <div className="CustomContainer">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default Index;