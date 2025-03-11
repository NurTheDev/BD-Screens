import propTypes from "prop-types";
import React from "react";
const Button = ({ btnContent }) => {
  return (
    <button className="py-[10px] px-6 rounded-sm bg-primaryColor hover:bg-transparent border border-primaryColor transition-all duration-100 hover:scale-95 text-sm lg:text-base">
      {btnContent}
    </button>
  );
};
Button.propTypes = {
  btnContent: propTypes.string.isRequired,
};
export default Button;
