import propTypes from "prop-types";
import React from "react";
import { Link } from "react-router-dom";

const Button = ({ btnContent }) => {
  return (
    <Link
      className="py-[10px] cursor-pointer px-6 rounded-sm bg-primaryColor hover:bg-transparent border border-primaryColor transition-all duration-100 hover:scale-95 text-sm lg:text-base"
      to={"/signin"}
    >
      {btnContent}
    </Link>
  );
};
Button.propTypes = {
  btnContent: propTypes.string.isRequired,
};
export default Button;
