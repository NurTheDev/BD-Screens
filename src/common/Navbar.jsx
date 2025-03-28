import React, { useEffect, useState } from "react";
import { FaBell, FaChevronRight, FaRegSmileBeam } from "react-icons/fa";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { LuDrama } from "react-icons/lu";
import avatar from "../assets/avatar.gif";
import {
  MdArrowDropDown,
  MdOndemandVideo,
  MdOutlineConnectedTv,
  MdOutlineLocalMovies,
} from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import Button from "./Button";
import { getDatabase, ref, onValue } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { CgProfile } from "react-icons/cg";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const auth = getAuth();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (user) {
      const db = getDatabase();
      const starCountRef = ref(db, "users/" + user?.uid);
      onValue(starCountRef, (snapshot) => {
        setUserData(snapshot.val());
      });
    }
  }, [user]);
  console.log("userData", userData);
  const location = useLocation();
  const navigate = useNavigate();
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
  const profileItem = [
    {
      title: "My Profile",
      path: `/profile/${user?.uid}`,
      icon: <CgProfile />,
      id: 1,
    },
    {
      title: "Settings",
      path: `/settings`,
      icon: <IoSettingsOutline />,
      id: 2,
    },
    { title: "Notification", path: "/notification", icon: <FaBell />, id: 3 },
    { title: "Log out", path: "/signin", icon: <IoSettingsOutline />, id: 4 },
  ];
  const handleClick = () => {
    navigate("/search ");
  };
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
        <span
          onClick={handleClick}
          className="pr-6 lg:text-xl text-lg cursor-pointer hover:scale-105"
        >
          <HiMagnifyingGlass />
        </span>
        {user ? (
          <div className={"flex items-center"}>
            <div>
              <img
                src={user.profile_picture || avatar}
                alt=""
                className={"rounded-full w-8 h-8 lg:w-10 lg:h-10 object-cover"}
              />
            </div>
            <div className="dropdown">
              <div tabIndex={0} role="button" className="cursor-pointer m-1">
                <span className={"text-subtitle-1"}>
                  <MdArrowDropDown />
                </span>
              </div>
              <div
                tabIndex={0}
                className="dropdown-content menu rounded-box z-1 p-2 shadow-sm w-52 lg:-right-12 right-0  space-y-2 mt-3 bg-primaryColor"
              >
                {profileItem?.map((item) => (
                  <div
                    key={item.id}
                    className={"flex items-center justify-between text-base"}
                  >
                    <Link
                      to={item.path}
                      className={"flex items-center gap-x-1 font-semibold"}
                    >
                      <span className={"text-subtitle-2"}>{item.icon}</span>
                      <span>{item.title}</span>
                    </Link>
                    <div>
                      {item.title === "My Profile" ||
                      item.title === "Settings" ? (
                        <Link to={item.path}>
                          <FaChevronRight />
                        </Link>
                      ) : (
                        <span className={"cursor-pointer"}>Allow</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Button btnContent={"Sign in"} />
        )}
      </div>
    </div>
  );
};

export default Navbar;
