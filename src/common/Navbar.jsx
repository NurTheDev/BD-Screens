import React from "react";
import { FaRegSmileBeam } from "react-icons/fa";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { IoHomeOutline } from "react-icons/io5";
import { LuDrama } from "react-icons/lu";
import {
  MdOndemandVideo,
  MdOutlineConnectedTv,
  MdOutlineLocalMovies,
} from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import Button from "./Button";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: <IoHomeOutline />, id: 1 },
    { name: "Movie", path: "/movie", icon: <MdOutlineLocalMovies />, id: 2 },
    { name: "Drama", path: "/drama", icon: <LuDrama />, id: 3 },
    {
      name: "Music Video",
      path: "/music-video",
      icon: <MdOndemandVideo />,
      id: 4,
    },
    {
      name: "Live Show",
      path: "/live-show",
      icon: <MdOutlineConnectedTv />,
      id: 5,
    },
    { name: "Comedies", path: "/comedies", icon: <FaRegSmileBeam />, id: 6 },
  ];
  return (
    <div className="navbar shadow-sm xl:px-16">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />{" "}
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
          >
            {navItems?.map((item) => (
              <li
                key={item.id}
                className={`pl-2 flex-row flex items-center justify-center  hover:text-white${
                  location.pathname === item.path
                    ? " activeNav"
                    : "text-light-gray"
                }`}
              >
                <Link to={item.path}>
                  <span className="p-0">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <img src={logo} alt={logo} />
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 ml-14">
            {navItems?.map((item) => (
              <li
                key={item.id}
                className={`pl-2 flex-row flex items-center justify-center  hover:text-white${
                  location.pathname === item.path
                    ? " activeNav"
                    : "text-light-gray"
                }`}
              >
                <Link to={item.path}>
                  {" "}
                  <span className="p-0">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="navbar-end">
        <span className="pr-6 lg:text-xl text-lg cursor-pointer hover:scale-105">
          <HiMagnifyingGlass />
        </span>
        <Button btnContent={"Sign in"} />
      </div>
    </div>
  );
};

export default Navbar;
