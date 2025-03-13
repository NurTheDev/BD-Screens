import React from "react";
import logo from "../assets/logo.png";
import { FaFacebookF } from "react-icons/fa";
import { CiInstagram } from "react-icons/ci";
import { FaXTwitter } from "react-icons/fa6";

function Footer() {
  return (
    <div className="flex flex-col items-center justify-center py-10 lg:py-16 xl:py-28 border-t border-t-black-medium mt-8 lg:mt-14 xl:mt-20">
      <div>
        <img src={logo} alt={logo} />
      </div>
      <ul className="flex lg:flex-row items-center justify-center text-sm lg:text-base xl:text-lg font-semibold gap-x-5 lg:gap-x-10 mt-5 lg:mt-10">
        <li>Feedback</li>
        <li>Help</li>
        <li>FAQ</li>
      </ul>
      <div className={`flex justify-center items-center gap-x-4 mt-5 lg:mt-10`}>
        <p>FOLLOW ON:</p>
        <div className={`flex gap-5 lg:gap-10  text-subtitle-1`}>
          <span>
            <FaFacebookF />
          </span>
          <span>
            <CiInstagram />
          </span>
          <span>
            <FaXTwitter />
          </span>
        </div>
      </div>
      <p className={`mt-10 text-black-medium`}>©2021 All rights reserved</p>
    </div>
  );
}

export default Footer;
